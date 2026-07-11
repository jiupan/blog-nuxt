import { Prisma, PostStatus } from '@prisma/client'
import { z } from 'zod'
import { badRequest, conflict, notFound } from '../../utils/api-error'
import { prisma } from '../../utils/prisma'
import { createRandomPostSlug, normalizePostSlug } from '../../utils/slug'
import { refreshKnowledgeDocumentState } from '../knowledge/knowledge-state.service'
import { queueKnowledgePostSync, setKnowledgeEnabled } from '../knowledge/knowledge.service'

const postStatusSchema = z.enum([PostStatus.DRAFT, PostStatus.PUBLISHED, PostStatus.ARCHIVED])

export const createPostSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  summary: z.string().optional().nullable(),
  content: z.string().min(1),
  cover: z.string().optional().nullable(),
  categoryId: z.number().int().optional().nullable(),
  tagIds: z.array(z.number().int()).default([]),
  status: postStatusSchema.default(PostStatus.DRAFT),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  isPinned: z.boolean().optional().default(false)
})

export const updatePostSchema = createPostSchema.extend({
  slug: z.string().min(1),
  status: postStatusSchema,
  isPinned: z.boolean().optional()
})

export type CreatePostInput = z.infer<typeof createPostSchema>
export type UpdatePostInput = z.infer<typeof updatePostSchema>

export async function createPost(input: CreatePostInput) {
  const slug = await resolvePostSlug(input.slug)

  try {
    const created = await prisma.post.create({
      data: {
        title: input.title,
        slug,
        summary: input.summary,
        content: input.content,
        cover: input.cover,
        categoryId: input.categoryId,
        status: input.status,
        publishedAt: resolvePublishedAt(input.status),
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
        isPinned: input.isPinned,
        pinnedAt: resolvePinnedAt(input.isPinned),
        tags: {
          create: normalizeTagIds(input.tagIds).map((tagId) => ({ tagId }))
        }
      }
    })
    await autoSyncPublishedPost(created.id, input.status).catch(() => null)
    return created
  } catch (error) {
    handlePostWriteError(error)
  }
}

export async function updatePost(id: number, input: UpdatePostInput) {
  const current = await prisma.post.findUnique({ where: { id } })

  if (!current) {
    throw createPostNotFoundError()
  }

  const slug = normalizePostSlug(input.slug)
  const isPinned = input.isPinned ?? current.isPinned ?? false

  if (!slug) {
    throw badRequest('文章别名不能为空')
  }

  try {
    const updated = await prisma.post.update({
      where: { id },
      data: {
        title: input.title,
        slug,
        summary: input.summary,
        content: input.content,
        cover: input.cover,
        categoryId: input.categoryId,
        status: input.status,
        publishedAt: resolvePublishedAt(input.status, current.publishedAt),
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
        isPinned,
        pinnedAt: resolvePinnedAt(isPinned, current.pinnedAt),
        tags: {
          deleteMany: {},
          create: normalizeTagIds(input.tagIds).map((tagId) => ({ tagId }))
        }
      }
    })
    await autoSyncPublishedPost(id, input.status).catch(() => null)
    return updated
  } catch (error) {
    handlePostWriteError(error)
  }
}

async function autoSyncPublishedPost(postId: number, status: PostStatus) {
  if (status !== PostStatus.PUBLISHED) {
    await refreshKnowledgeDocumentState(postId).catch(() => null)
    return
  }

  const existing = await prisma.knowledgeDocument.findUnique({ where: { postId }, select: { enabled: true } })
  if (existing && !existing.enabled) return
  const document = !existing
    ? await setKnowledgeEnabled(postId, true)
    : await refreshKnowledgeDocumentState(postId)
  if (document?.status === 'SYNCED') return
  await queueKnowledgePostSync(postId)
}

export async function deletePost(id: number) {
  try {
    await prisma.post.delete({ where: { id } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw createPostNotFoundError()
    }

    throw error
  }
}

async function resolvePostSlug(value?: string | null) {
  const customSlug = value ? normalizePostSlug(value) : ''

  if (customSlug) {
    return customSlug
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = createRandomPostSlug()
    const exists = await prisma.post.findUnique({ where: { slug }, select: { id: true } })

    if (!exists) {
      return slug
    }
  }

  return createRandomPostSlug(12)
}

function resolvePublishedAt(status: PostStatus, currentPublishedAt?: Date | null) {
  if (status !== PostStatus.PUBLISHED) {
    return null
  }

  return currentPublishedAt || new Date()
}

function resolvePinnedAt(isPinned: boolean, currentPinnedAt?: Date | null) {
  if (!isPinned) {
    return null
  }

  return currentPinnedAt || new Date()
}

function normalizeTagIds(tagIds: number[]) {
  return [...new Set(tagIds)]
}

function handlePostWriteError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw conflict('文章别名已存在，请换一个别名后重试')
  }

  throw error
}

function createPostNotFoundError() {
  return notFound('文章不存在')
}
