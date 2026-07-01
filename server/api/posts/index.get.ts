import { prisma } from '~~/server/utils/prisma'
import { ok } from '~~/server/utils/response'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  keyword: z.string().optional().default(''),
  category: z.string().optional().default(''),
  tag: z.string().optional().default('')
})

export default defineEventHandler(async (event) => {
  const query = querySchema.parse(getQuery(event))
  const page = query.page
  const pageSize = query.pageSize
  const keyword = query.keyword.trim()
  const category = query.category.trim()
  const tag = query.tag.trim()
  const now = new Date()

  const where = {
    status: 'PUBLISHED' as const,
    publishedAt: { lte: now },
    ...(keyword
      ? {
          OR: [
            { title: { contains: keyword, mode: 'insensitive' as const } },
            { summary: { contains: keyword, mode: 'insensitive' as const } },
            { content: { contains: keyword, mode: 'insensitive' as const } }
          ]
        }
      : {}),
    ...(category ? { category: { slug: category } } : {}),
    ...(tag ? { tags: { some: { tag: { slug: tag } } } } : {})
  }

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        category: true,
        tags: { include: { tag: true } }
      },
      orderBy: { publishedAt: 'desc' },
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
