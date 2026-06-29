import { prisma } from '~~/server/utils/prisma'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async () => {
  const now = new Date()
  const items = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          posts: {
            where: {
              post: {
                status: 'PUBLISHED',
                publishedAt: { lte: now }
              }
            }
          }
        }
      }
    }
  })

  return ok(items)
})
