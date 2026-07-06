import { z } from 'zod'
import { generatePostSummary } from '~~/server/utils/ai'
import { withAiUsage } from '~~/server/utils/ai-usage'
import { prisma } from '~~/server/utils/prisma'
import { ok } from '~~/server/utils/response'
import { notFound } from '~~/server/utils/api-error'

const bodySchema = z.object({
  postId: z.coerce.number().int().positive()
})

export default defineEventHandler(async (event) => {
  const body = bodySchema.parse(await readBody(event))

  const result = await withAiUsage(event, 'article-summary', async () => {
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
      throw notFound('文章不存在或尚未发布')
    }

    return {
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug
      },
      result: await generatePostSummary({
        title: post.title,
        summary: post.summary,
        content: post.content,
        category: post.category,
        tags: post.tags.map((item) => item.tag)
      })
    }
  })

  return ok(result)
})
