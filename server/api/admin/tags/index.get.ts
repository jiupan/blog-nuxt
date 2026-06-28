import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const items = await prisma.tag.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { posts: true } } }
  })
  return ok(items)
})
