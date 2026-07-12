import { PostStatus, Prisma } from '@prisma/client'
import { z } from 'zod'
import { renderMarkdown } from '~~/server/utils/markdown'
import { prisma } from '~~/server/utils/prisma'
import { normalizePostSlug } from '~~/server/utils/slug'
import { notFound } from '~~/server/utils/api-error'
import { getAdminPostRelations, getPostRelations } from '~~/server/services/related-posts/relation.service'

const postInclude = {
  category: true,
  tags: { include: { tag: true } }
} satisfies Prisma.PostInclude
const adminPostInclude = { ...postInclude, knowledgeDocument: true } satisfies Prisma.PostInclude

type PostWithTaxonomy = Prisma.PostGetPayload<{ include: typeof postInclude }>
type PostWithFlatTags = Omit<PostWithTaxonomy, 'tags'> & {
  tags: Array<PostWithTaxonomy['tags'][number]['tag']>
}

export const publicPostListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  keyword: z.string().optional().default(''),
  category: z.string().optional().default(''),
  tag: z.string().optional().default('')
})

export const publicArchiveQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  category: z.string().optional().default(''),
  year: z.coerce.number().int().min(1970).max(9999).optional()
})

export const adminPostListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(8),
  status: z.string().optional(),
  search: z.string().optional(),
  categoryId: z.coerce.number().int().min(1).optional(),
  tagId: z.coerce.number().int().min(1).optional(),
  sort: z.string().optional().default('createdAt_desc')
})

export type PublicPostListQuery = z.infer<typeof publicPostListQuerySchema>
export type PublicArchiveQuery = z.infer<typeof publicArchiveQuerySchema>
export type AdminPostListQuery = z.infer<typeof adminPostListQuerySchema>

export async function listPublicPosts(query: PublicPostListQuery) {
  const page = query.page
  const pageSize = query.pageSize
  const keyword = query.keyword.trim()
  const category = query.category.trim()
  const tag = query.tag.trim()
  const where = buildPublishedPostWhere({
    ...(keyword
      ? {
          OR: [
            { title: { contains: keyword, mode: 'insensitive' } },
            { summary: { contains: keyword, mode: 'insensitive' } },
            { content: { contains: keyword, mode: 'insensitive' } }
          ]
        }
      : {}),
    ...(category ? { category: { slug: category } } : {}),
    ...(tag ? { tags: { some: { tag: { slug: tag } } } } : {})
  })

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: postInclude,
      orderBy: [
        { isPinned: 'desc' },
        { pinnedAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
        { id: 'desc' }
      ],
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.post.count({ where })
  ])

  return {
    items: items.map(mapPostTags),
    total,
    page,
    pageSize
  }
}

export async function listPublicArchive(query: PublicArchiveQuery) {
  const now = new Date()
  const category = query.category.trim()
  const where = buildPublishedPostWhere({
    ...(category ? { category: { slug: category } } : {})
  }, now)

  if (query.year !== undefined) {
    where.publishedAt = {
      gte: new Date(Date.UTC(query.year, 0, 1)),
      lt: new Date(Date.UTC(query.year + 1, 0, 1)),
      lte: now
    }
  }

  const [items, total, yearRows] = await Promise.all([
    prisma.post.findMany({
      where,
      include: postInclude,
      orderBy: [
        { publishedAt: { sort: 'desc', nulls: 'last' } },
        { id: 'desc' }
      ],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize
    }),
    prisma.post.count({ where }),
    prisma.$queryRaw<Array<{ year: number }>>(Prisma.sql`
      SELECT DISTINCT EXTRACT(YEAR FROM "publishedAt")::int AS "year"
      FROM "Post"
      WHERE "status" = ${PostStatus.PUBLISHED}::"PostStatus"
        AND "publishedAt" IS NOT NULL
        AND "publishedAt" <= ${now}
      ORDER BY "year" DESC
    `)
  ])

  return {
    items: items.map(mapPostTags),
    total,
    page: query.page,
    pageSize: query.pageSize,
    years: yearRows.map(row => row.year)
  }
}

export async function getPublicPostDetail(rawSlug: string) {
  const slug = normalizePostSlug(rawSlug)
  const now = new Date()
  const post = await prisma.post.findFirst({
    where: buildPublishedPostWhere({ slug }, now),
    include: postInclude
  })

  if (!post) {
    throw notFound('文章不存在')
  }

  await prisma.post.update({
    where: { id: post.id },
    data: { viewCount: { increment: 1 } }
  })

  const [previous, next, rendered, relations] = await Promise.all([
    findAdjacentPublicPost(post, 'previous', now),
    findAdjacentPublicPost(post, 'next', now),
    renderMarkdown(post.content),
    getPostRelations(post.id)
  ])

  return {
    ...mapPostTags(post),
    rendered,
    previous,
    next,
    relations
  }
}

export async function getPublishedPostById(postId: number) {
  const post = await prisma.post.findFirst({
    where: buildPublishedPostWhere({ id: postId }),
    include: postInclude
  })

  if (!post) {
    throw notFound('文章不存在或尚未发布')
  }

  return post
}

export async function listSitemapPosts() {
  return prisma.post.findMany({
    where: buildPublishedPostWhere(),
    select: {
      slug: true,
      updatedAt: true
    }
  })
}

export async function listAdminPosts(query: AdminPostListQuery) {
  const page = query.page
  const pageSize = query.pageSize
  const search = query.search?.trim()
  const where: Prisma.PostWhereInput = {}

  if (query.status && Object.values(PostStatus).includes(query.status as PostStatus)) {
    where.status = query.status as PostStatus
  }

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { slug: { contains: search } }
    ]
  }

  if (query.categoryId) {
    where.categoryId = query.categoryId
  }

  if (query.tagId) {
    where.tags = { some: { tagId: query.tagId } }
  }

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: adminPostInclude,
      orderBy: resolveAdminPostOrderBy(query.sort),
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.post.count({ where })
  ])

  return {
    items: items.map(mapPostTags),
    total,
    page,
    pageSize
  }
}

export async function getAdminPostDetail(id: number) {
  const [post, relations] = await Promise.all([
    prisma.post.findUnique({
      where: { id },
      include: adminPostInclude
    }),
    getAdminPostRelations(id)
  ])

  if (!post) {
    throw notFound('文章不存在')
  }

  return {
    ...mapPostTags(post),
    tagIds: post.tags.map((item) => item.tagId),
    relations
  }
}

export function buildPublishedPostWhere(input: Prisma.PostWhereInput = {}, now = new Date()): Prisma.PostWhereInput {
  return {
    ...input,
    status: PostStatus.PUBLISHED,
    publishedAt: { lte: now }
  }
}

function findAdjacentPublicPost(
  post: { id: number, createdAt: Date },
  direction: 'previous' | 'next',
  now: Date
) {
  const isPrevious = direction === 'previous'

  return prisma.post.findFirst({
    where: buildPublishedPostWhere({
      OR: [
        { createdAt: isPrevious ? { gt: post.createdAt } : { lt: post.createdAt } },
        {
          createdAt: post.createdAt,
          id: isPrevious ? { gt: post.id } : { lt: post.id }
        }
      ]
    }, now),
    orderBy: [
      { createdAt: isPrevious ? 'asc' : 'desc' },
      { id: isPrevious ? 'asc' : 'desc' }
    ],
    select: { title: true, slug: true }
  })
}

function resolveAdminPostOrderBy(sort: string): Prisma.PostOrderByWithRelationInput | Prisma.PostOrderByWithRelationInput[] {
  switch (sort) {
    case 'pinned_desc':
      return [
        { isPinned: 'desc' },
        { pinnedAt: { sort: 'desc', nulls: 'last' } },
        { updatedAt: 'desc' }
      ]
    case 'createdAt_asc':
      return { createdAt: 'asc' }
    case 'createdAt_desc':
      return { createdAt: 'desc' }
    case 'updatedAt_asc':
      return { updatedAt: 'asc' }
    case 'updatedAt_desc':
      return { updatedAt: 'desc' }
    case 'title_asc':
      return { title: 'asc' }
    case 'title_desc':
      return { title: 'desc' }
    default:
      return { updatedAt: 'desc' }
  }
}

function mapPostTags<T extends PostWithTaxonomy>(post: T): Omit<T, 'tags'> & { tags: PostWithFlatTags['tags'] } {
  return {
    ...post,
    tags: post.tags.map((item) => item.tag)
  }
}
