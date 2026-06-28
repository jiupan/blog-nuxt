import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import type { Prisma } from '@prisma/client'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = getQuery(event)

  const page = Number(query.page || 1)
  const pageSize = Math.min(Number(query.pageSize || 8), 100)
  const status = query.status as string | undefined
  const search = (query.search as string)?.trim()
  const categoryId = query.categoryId ? Number(query.categoryId) : undefined
  const tagId = query.tagId ? Number(query.tagId) : undefined
  const sort = (query.sort as string) || 'updatedAt_desc'

  const where: Prisma.PostWhereInput = {}

  if (status && ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
    where.status = status
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
