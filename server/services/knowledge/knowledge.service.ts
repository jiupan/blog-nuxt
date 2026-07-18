import {
  KnowledgeDocumentStatus,
  PostStatus
} from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { badRequest, notFound } from '~~/server/utils/api-error'
import { prisma } from '~~/server/utils/prisma'
import { hashPostKnowledgeSource, indexPost } from '~~/server/services/rag/indexer.service'
import { refreshKnowledgeDocumentState } from './knowledge-state.service'
import { syncKnowledgeFileContent } from '../knowledge-files/knowledge-file.service'
import { enqueueKnowledgeJob } from './knowledge-job.service'

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

  const [documents, files, chunkStats, fileChunkStats, pending, pendingFiles, failed, failedFiles, todayQueries, recentJobs, recentQueries] = await Promise.all([
    prisma.knowledgeDocument.count({ where: { enabled: true } }),
    prisma.knowledgeFile.count({ where: { enabled: true } }),
    prisma.postChunk.aggregate({ _count: { id: true }, _sum: { tokenCount: true }, where: { status: 'ACTIVE' } }),
    prisma.knowledgeFileChunk.aggregate({ _count: { id: true }, _sum: { tokenCount: true }, where: { status: 'ACTIVE' } }),
    prisma.knowledgeDocument.count({ where: { enabled: true, status: { in: ['PENDING', 'STALE'] } } }),
    prisma.knowledgeFile.count({ where: { enabled: true, status: { in: ['PENDING', 'STALE'] } } }),
    prisma.knowledgeDocument.count({ where: { enabled: true, status: 'FAILED' } }),
    prisma.knowledgeFile.count({ where: { enabled: true, status: 'FAILED' } }),
    prisma.ragQueryLog.count({ where: { createdAt: { gte: today } } }),
    prisma.knowledgeSyncJob.findMany({ take: 6, orderBy: { createdAt: 'desc' }, include: { post: { select: { title: true } }, knowledgeFile: { select: { name: true } } } }),
    prisma.ragQueryLog.findMany({ take: 6, orderBy: { createdAt: 'desc' }, select: { id: true, question: true, status: true, durationMs: true, createdAt: true } })
  ])

  return {
    stats: {
      documents,
      files,
      chunks: chunkStats._count.id + fileChunkStats._count.id,
      tokens: (chunkStats._sum.tokenCount || 0) + (fileChunkStats._sum.tokenCount || 0),
      pending: pending + pendingFiles,
      failed: failed + failedFiles,
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
  const post = enabled ? await getIndexablePost(postId) : await getExistingPost(postId)
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
  await getIndexablePost(postId)
  return enqueueKnowledgeJob({ type: 'SINGLE_POST', postId, totalItems: 1 })
}

export async function queueKnowledgePostSync(postId: number) {
  return enqueueKnowledgeJob({ type: 'SINGLE_POST', postId, totalItems: 1 })
}

export async function queueAllKnowledgeDocumentsSync() {
  const [documents, files] = await Promise.all([
    prisma.knowledgeDocument.count({ where: { enabled: true } }),
    prisma.knowledgeFile.count({ where: { enabled: true } })
  ])
  return enqueueKnowledgeJob({ type: 'FULL_REBUILD', totalItems: documents + files })
}

export async function executeFullKnowledgeSync(
  onProgress: (progress: { completedItems: number, successItems: number, failedItems: number }) => Promise<void>
) {
  const [documents, files] = await Promise.all([
    prisma.knowledgeDocument.findMany({ where: { enabled: true }, select: { postId: true } }),
    prisma.knowledgeFile.findMany({ where: { enabled: true }, select: { id: true } })
  ])
  let successItems = 0
  let failedItems = 0
  for (const { postId } of documents) {
    try {
      await executeKnowledgePostSync(postId)
      successItems += 1
    } catch (error) {
      failedItems += 1
      await prisma.knowledgeDocument.updateMany({ where: { postId }, data: { status: 'FAILED', lastError: getErrorMessage(error) } })
    }
    await onProgress({ completedItems: successItems + failedItems, successItems, failedItems })
  }
  for (const { id } of files) {
    try {
      await syncKnowledgeFileContent(id)
      successItems += 1
    } catch (error) {
      failedItems += 1
      await prisma.knowledgeFile.updateMany({ where: { id }, data: { status: 'FAILED', lastError: getErrorMessage(error) } })
    }
    await onProgress({ completedItems: successItems + failedItems, successItems, failedItems })
  }
  return { completedItems: successItems + failedItems, successItems, failedItems }
}

export async function listKnowledgeJobs() {
  return prisma.knowledgeSyncJob.findMany({ take: 100, orderBy: { createdAt: 'desc' }, include: { post: { select: { title: true } }, knowledgeFile: { select: { name: true } } } })
}

export async function listRagQueryLogs() {
  return prisma.ragQueryLog.findMany({ take: 100, orderBy: { createdAt: 'desc' }, include: { user: { select: { username: true } } } })
}

async function refreshAllKnowledgeStates() {
  const documents = await prisma.knowledgeDocument.findMany({ where: { enabled: true }, select: { postId: true } })
  await Promise.all(documents.map((item) => refreshKnowledgeDocumentState(item.postId)))
}

export async function executeKnowledgePostSync(postId: number) {
  const post = await getIndexablePost(postId)
  const sourceHash = hashPostKnowledgeSource(post)
  await prisma.knowledgeDocument.upsert({
    where: { postId },
    create: { postId, enabled: true, status: 'SYNCING', sourceHash },
    update: { enabled: true, status: 'SYNCING', sourceHash, lastError: null }
  })
  const result = await indexPost(post)
  const latestPost = await getIndexablePost(postId)
  if (hashPostKnowledgeSource(latestPost) !== sourceHash) {
    throw new Error('文章在同步期间发生更新，任务将自动重试')
  }
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
  const post = await getExistingPost(postId)
  if (post.status !== PostStatus.PUBLISHED) throw badRequest('只有已发布文章可以加入知识库')
  return post
}

async function getExistingPost(postId: number) {
  const post = await prisma.post.findUnique({ where: { id: postId }, include: postInclude })
  if (!post) throw notFound('文章不存在')
  return post
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 2000) : '未知同步错误'
}
