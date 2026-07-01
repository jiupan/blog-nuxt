import { prisma } from '~~/server/utils/prisma'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async () => {
  const now = new Date()
  const items = await prisma.category.findMany({
    orderBy: { id: 'asc' },
    include: {
      _count: {
        select: {
          posts: {
            where: {
              status: 'PUBLISHED',
              publishedAt: { lte: now }
            }
          }
        }
      }
    }
  })

  return ok(items)
})
