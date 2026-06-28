import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      category: true,
      tags: { include: { tag: true } }
    }
  })

  if (!post) {
    throw createError({ statusCode: 404, statusMessage: '文章不存在' })
  }

  return ok({
    ...post,
    tagIds: post.tags.map((item) => item.tagId),
    tags: post.tags.map((item) => item.tag)
  })
})
