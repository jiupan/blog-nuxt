import { createHash } from 'node:crypto'
import { Prisma, type Post } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { badRequest, conflict, unauthorized } from '../../utils/api-error'
import { normalizeSlug } from '../../utils/slug'
import { autoSyncPublishedPost, createPost } from '../posts/post.service'
import type { AgentPostInput } from './agent.schema'

const publicationInclude = {
  post: { select: { id: true, slug: true, title: true, status: true, publishedAt: true } }
} as const
type PublicationPost = Pick<Post, 'id' | 'slug' | 'title' | 'status' | 'publishedAt'>

export function hashAgentPayload(input: AgentPostInput) {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex')
}

async function resolveAgentTagIds(tx: Prisma.TransactionClient, input: AgentPostInput) {
  if (!input.tagNames?.length) return input.tagIds
  const ids = new Set(input.tagIds)
  const tags = await tx.tag.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, name: true, slug: true, sort: true }
  })
  const slugs = new Set(tags.map((tag) => tag.slug))
  let sort = tags.reduce((last, tag) => Math.max(last, tag.sort), -1)
  for (const name of input.tagNames) {
    const existing = tags.find((tag) => tag.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      ids.add(existing.id)
      continue
    }

    const base = normalizeSlug(name)
    let slug = base
    for (let suffix = 2; slugs.has(slug); suffix++) {
      slug = `${base}-${suffix}`
    }
    const tag = await tx.tag.create({ data: { name, slug, sort: ++sort } })
    tags.push(tag)
    slugs.add(slug)
    ids.add(tag.id)
  }
  return [...ids]
}

export async function publishAgentPost(keyId: number, input: AgentPostInput) {
  const payloadHash = hashAgentPayload(input)
  const unique = { keyId_requestId: { keyId, requestId: input.requestId } }
  const metadata = {
    keyId,
    requestId: input.requestId,
    payloadHash,
    title: input.title,
    requestedStatus: input.status,
    sources: input.sources
  }
  let outcome: { post: PublicationPost; replayed: boolean } | undefined
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        outcome = await prisma.$transaction(
          async (tx) => {
            const key = await tx.agentApiKey.findUnique({
              where: { id: keyId },
              select: { revokedAt: true, createdBy: { select: { role: true, status: true } } }
            })
            if (
              !key ||
              key.revokedAt ||
              key.createdBy?.role !== 'ADMIN' ||
              key.createdBy.status !== 'ACTIVE'
            ) {
              throw unauthorized('Agent 密钥无效或已停用')
            }
            const existing = await tx.agentPublication.findUnique({
              where: unique,
              include: publicationInclude
            })
            if (existing) {
              if (existing.payloadHash !== payloadHash)
                throw conflict('requestId 已用于其他内容，请为新文章使用新的编号')
              if (existing.status === 'SUCCESS') {
                if (!existing.post)
                  throw conflict('该请求创建的文章已删除，不会重复创建；新文章请使用新的 requestId')
                return { post: existing.post, replayed: true }
              }
            }
            if (
              input.categoryId &&
              !(await tx.category.findUnique({
                where: { id: input.categoryId },
                select: { id: true }
              }))
            ) {
              throw badRequest('分类不存在，请重新获取分类和标签')
            }
            if (
              input.tagIds.length &&
              (await tx.tag.count({ where: { id: { in: input.tagIds } } })) !== input.tagIds.length
            ) {
              throw badRequest('部分标签不存在，请重新获取分类和标签')
            }
            const record = existing
              ? await tx.agentPublication.update({
                  where: { id: existing.id },
                  data: { status: 'PENDING', error: null }
                })
              : await tx.agentPublication.create({ data: metadata })
            const tagIds = await resolveAgentTagIds(tx, input)
            const post = await createPost({ ...input, tagIds, isPinned: false }, tx)
            await tx.agentPublication.update({
              where: { id: record.id },
              data: { status: 'SUCCESS', postId: post.id, error: null }
            })
            // Updating the key serializes this write against concurrent revocation.
            await tx.agentApiKey.update({ where: { id: keyId }, data: { lastUsedAt: new Date() } })
            return { post, replayed: false }
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        )
        break
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          ['P2034', 'P2002'].includes(error.code)
        ) {
          if (attempt < 2) continue
          throw conflict('同一请求正在处理中，请稍后使用相同 requestId 和内容重试')
        }
        throw error
      }
    }
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode !== 401 && statusCode !== 409) {
      const message =
        statusCode && statusCode < 500
          ? (error as Error).message
          : '发布失败，请使用相同 requestId 和内容重试'
      await prisma.agentPublication
        .upsert({
          where: unique,
          create: { ...metadata, status: 'FAILED', error: message },
          update: {}
        })
        .then(() =>
          prisma.agentPublication.updateMany({
            where: { keyId, requestId: input.requestId, payloadHash, status: 'FAILED' },
            data: { error: message }
          })
        )
        .catch(() => undefined)
    }
    throw error
  }
  if (!outcome) throw conflict('请求尚未完成，请稍后重试')
  if (!outcome.replayed)
    await autoSyncPublishedPost(outcome.post.id, outcome.post.status).catch(() => null)
  return {
    requestId: input.requestId,
    replayed: outcome.replayed,
    post: {
      id: outcome.post.id,
      slug: outcome.post.slug,
      title: outcome.post.title,
      status: outcome.post.status,
      publishedAt: outcome.post.publishedAt,
      path:
        outcome.post.status === 'PUBLISHED'
          ? `/${encodeURIComponent(outcome.post.slug)}.html`
          : null,
      editPath: `/admin/posts/${outcome.post.id}`
    }
  }
}

export async function listAgentPublications(page: number, pageSize: number) {
  const [total, items] = await prisma.$transaction([
    prisma.agentPublication.count(),
    prisma.agentPublication.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        requestId: true,
        title: true,
        requestedStatus: true,
        status: true,
        error: true,
        sources: true,
        createdAt: true,
        updatedAt: true,
        key: { select: { name: true, prefix: true } },
        ...publicationInclude
      }
    })
  ])
  return { items, total, page, pageSize }
}
