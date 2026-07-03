import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { PostStatus, type Prisma } from '@prisma/client'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(8),
  status: z.string().optional(),
  search: z.string().optional(),
  categoryId: z.coerce.number().int().min(1).optional(),
  tagId: z.coerce.number().int().min(1).optional(),
  sort: z.string().optional().default('createdAt_desc')
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = querySchema.parse(getQuery(event))

  const page = query.page
  const pageSize = query.pageSize
  const status = query.status
  const search = query.search?.trim()
  const categoryId = query.categoryId
  const tagId = query.tagId
  const sort = query.sort

  const where: Prisma.PostWhereInput = {}

  if (status && Object.values(PostStatus).includes(status as PostStatus)) {
    where.status = status as PostStatus
  }

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { slug: { contains: search } }
    ]
  }

  if (categoryId) {
    where.categoryId = categoryId
  }

  if (tagId) {
    where.tags = { some: { tagId } }
  }

  const orderBy: Prisma.PostOrderByWithRelationInput = (() => {
    switch (sort) {
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
  })()

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        category: true,
        tags: { include: { tag: true } }
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.post.count({ where })
  ])

  return ok({
    items: items.map((post) => ({
      ...post,
      tags: post.tags.map((item) => item.tag)
    })),
    total,
    page,
    pageSize
  })
})
