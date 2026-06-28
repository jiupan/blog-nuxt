import { prisma } from '~~/server/utils/prisma'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Number(query.page || 1)
  const pageSize = Math.min(Number(query.pageSize || 10), 50)
  const keyword = String(query.keyword || '').trim()
  const category = String(query.category || '').trim()
  const tag = String(query.tag || '').trim()
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
