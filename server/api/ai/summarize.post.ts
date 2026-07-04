import { z } from 'zod'
import { generatePostSummary } from '~~/server/utils/ai'
import { requireAdmin } from '~~/server/utils/auth'
import { prisma } from '~~/server/utils/prisma'
import { ok } from '~~/server/utils/response'

const bodySchema = z.object({
  postId: z.coerce.number().int().positive()
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = bodySchema.parse(await readBody(event))
  const now = new Date()

  const post = await prisma.post.findFirst({
    where: {
      id: body.postId,
      status: 'PUBLISHED',
      publishedAt: { lte: now }
    },
    include: {
      category: true,
      tags: { include: { tag: true } }
    }
  })

  if (!post) {
    throw createError({
      statusCode: 404,
      statusMessage: '文章不存在或尚未发布'
    })
  }

  const result = await generatePostSummary({
    title: post.title,
    summary: post.summary,
    content: post.content,
    category: post.category,
    tags: post.tags.map((item) => item.tag)
  })

  return ok({
    post: {
      id: post.id,
      title: post.title,
      slug: post.slug
    },
    result
  })
})
