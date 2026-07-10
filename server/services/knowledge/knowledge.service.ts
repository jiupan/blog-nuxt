import {
  KnowledgeDocumentStatus,
  KnowledgeSyncJobStatus,
  KnowledgeSyncJobType,
  PostStatus
} from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { badRequest, notFound } from '~~/server/utils/api-error'
import { prisma } from '~~/server/utils/prisma'
import { hashPostKnowledgeSource, indexPost } from '~~/server/services/rag/indexer.service'
import { refreshKnowledgeDocumentState } from './knowledge-state.service'

const postInclude = {
  category: true,
  tags: { include: { tag: true } }
} satisfies Prisma.PostInclude

export const knowledgeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.nativeEnum(KnowledgeDocumentStatus).optional()
})

export async function getKnowledgeOverview() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [documents, chunkStats, pending, failed, todayQueries, recentJobs, recentQueries] = await Promise.all([
    prisma.knowledgeDocument.count({ where: { enabled: true } }),
    prisma.postChunk.aggregate({ _count: { id: true }, _sum: { tokenCount: true }, where: { status: 'ACTIVE' } }),
    prisma.knowledgeDocument.count({ where: { enabled: true, status: { in: ['PENDING', 'STALE'] } } }),
    prisma.knowledgeDocument.count({ where: { enabled: true, status: 'FAILED' } }),
    prisma.ragQueryLog.count({ where: { createdAt: { gte: today } } }),
    prisma.knowledgeSyncJob.findMany({ take: 6, orderBy: { createdAt: 'desc' }, include: { post: { select: { title: true } } } }),
    prisma.ragQueryLog.findMany({ take: 6, orderBy: { createdAt: 'desc' }, select: { id: true, question: true, status: true, durationMs: true, createdAt: true } })
  ])

  return {
    stats: {
      documents,
      chunks: chunkStats._count.id,
      tokens: chunkStats._sum.tokenCount || 0,
      pending,
      failed,
      todayQueries
    },
    recentJobs,
    recentQueries
  }
}

export async function listKnowledgeDocuments(input: z.infer<typeof knowledgeListQuerySchema>) {
  await refreshAllKnowledgeStates()
  const where: Prisma.KnowledgeDocumentWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.search ? { post: { title: { contains: input.search, mode: 'insensitive' } } } : {})
  }
  const [items, total] = await Promise.all([
    prisma.knowledgeDocument.findMany({
      where,
      include: { post: { select: { id: true, title: true, slug: true, status: true, updatedAt: true } } },
      orderBy: [{ updatedAt: 'desc' }],
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize
    }),
    prisma.knowledgeDocument.count({ where })
  ])
  return { items, total, page: input.page, pageSize: input.pageSize }
}

export async function getKnowledgeDocument(postId: number) {
  await refreshKnowledgeDocumentState(postId)
  const document = await prisma.knowledgeDocument.findUnique({
    where: { postId },
    include: { post: { select: { id: true, title: true, slug: true, status: true, updatedAt: true } } }
  })
  if (!document) throw notFound('文章尚未加入知识库')
  const chunks = await prisma.postChunk.findMany({
    where: { postId },
    orderBy: { chunkIndex: 'asc' },
    select: { id: true, chunkIndex: true, headingPath: true, content: true, contentHash: true, tokenCount: true, status: true, indexedAt: true }
  })
  return { ...document, chunks }
}

export async function setKnowledgeEnabled(postId: number, enabled: boolean) {
  const post = await getIndexablePost(postId)
  const sourceHash = hashPostKnowledgeSource(post)

  if (!enabled) {
    await prisma.$transaction([
      prisma.postChunk.deleteMany({ where: { postId } }),
      prisma.knowledgeDocument.upsert({
        where: { postId },
        create: { postId, enabled: false, status: 'DISABLED', sourceHash },
        update: { enabled: false, status: 'DISABLED', sourceHash, indexedHash: null, chunkCount: 0, tokenCount: 0, lastError: null }
      })
    ])
  } else {
    await prisma.knowledgeDocument.upsert({
      where: { postId },
      create: { postId, enabled: true, status: 'PENDING', sourceHash },
      update: { enabled: true, sourceHash, status: 'PENDING', lastError: null }
    })
  }

  return prisma.knowledgeDocument.findUnique({ where: { postId } })
}

export async function syncKnowledgePost(postId: number) {
  const job = await prisma.knowledgeSyncJob.create({
    data: { type: KnowledgeSyncJobType.SINGLE_POST, status: KnowledgeSyncJobStatus.RUNNING, postId, totalItems: 1, startedAt: new Date() }
  })
  try {
    const result = await syncPostInternal(postId)
    await prisma.knowledgeSyncJob.update({
      where: { id: job.id },
      data: { status: 'COMPLETED', completedItems: 1, successItems: 1, finishedAt: new Date() }
    })
    return { jobId: job.id, ...result }
  } catch (error) {
    const message = getErrorMessage(error)
    await prisma.knowledgeSyncJob.update({
      where: { id: job.id },
      data: { status: 'FAILED', completedItems: 1, failedItems: 1, error: message, finishedAt: new Date() }
    })
    await prisma.knowledgeDocument.updateMany({ where: { postId }, data: { status: 'FAILED', lastError: message } })
    throw error
  }
}

export async function syncAllKnowledgeDocuments() {
  const documents = await prisma.knowledgeDocument.findMany({ where: { enabled: true }, select: { postId: true } })
  const job = await prisma.knowledgeSyncJob.create({
    data: { type: 'FULL_REBUILD', status: 'RUNNING', totalItems: documents.length, startedAt: new Date() }
  })
  let successItems = 0
  let failedItems = 0
  for (const document of documents) {
    try {
      await syncPostInternal(document.postId)
      successItems += 1
    } catch (error) {
      failedItems += 1
      await prisma.knowledgeDocument.updateMany({ where: { postId: document.postId }, data: { status: 'FAILED', lastError: getErrorMessage(error) } })
    }
    await prisma.knowledgeSyncJob.update({
      where: { id: job.id },
      data: { completedItems: successItems + failedItems, successItems, failedItems }
    })
  }
  const status = failedItems ? (successItems ? 'PARTIAL_FAILED' : 'FAILED') : 'COMPLETED'
  return prisma.knowledgeSyncJob.update({ where: { id: job.id }, data: { status, finishedAt: new Date() } })
}

export async function listKnowledgeJobs() {
  return prisma.knowledgeSyncJob.findMany({ take: 100, orderBy: { createdAt: 'desc' }, include: { post: { select: { title: true } } } })
}

export async function listRagQueryLogs() {
  return prisma.ragQueryLog.findMany({ take: 100, orderBy: { createdAt: 'desc' }, include: { user: { select: { username: true } } } })
}

async function refreshAllKnowledgeStates() {
  const documents = await prisma.knowledgeDocument.findMany({ where: { enabled: true }, select: { postId: true } })
  await Promise.all(documents.map((item) => refreshKnowledgeDocumentState(item.postId)))
}

async function syncPostInternal(postId: number) {
  const post = await getIndexablePost(postId)
  const sourceHash = hashPostKnowledgeSource(post)
  await prisma.knowledgeDocument.upsert({
    where: { postId },
    create: { postId, enabled: true, status: 'SYNCING', sourceHash },
    update: { enabled: true, status: 'SYNCING', sourceHash, lastError: null }
  })
  const result = await indexPost(post)
  const chunks = await prisma.postChunk.aggregate({ where: { postId }, _count: { id: true }, _sum: { tokenCount: true } })
  const document = await prisma.knowledgeDocument.update({
    where: { postId },
    data: {
      status: 'SYNCED', indexedHash: sourceHash, sourceHash,
      chunkCount: chunks._count.id, tokenCount: chunks._sum.tokenCount || 0,
      embeddingModel: result.embeddingModel, embeddingDim: result.embeddingDim,
      lastIndexedAt: new Date(), lastError: null
    }
  })
  return { document, result }
}

async function getIndexablePost(postId: number) {
  const post = await prisma.post.findUnique({ where: { id: postId }, include: postInclude })
  if (!post) throw notFound('文章不存在')
  if (post.status !== PostStatus.PUBLISHED) throw badRequest('只有已发布文章可以加入知识库')
  return post
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 2000) : '未知同步错误'
}
