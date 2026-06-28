import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const page = Number(query.page || 1)
  const pageSize = Math.min(Number(query.pageSize || 20), 100)

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      include: {
        category: true,
        tags: { include: { tag: true } }
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.post.count()
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
