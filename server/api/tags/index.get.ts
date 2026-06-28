import { prisma } from '~~/server/utils/prisma'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async () => {
  const items = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { posts: true }
      }
    }
  })

  return ok(items)
})
