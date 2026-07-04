import { z } from 'zod'
import { generateWritingAssistant } from '~~/server/utils/ai'
import { withAiUsage } from '~~/server/utils/ai-usage'
import { prisma } from '~~/server/utils/prisma'
import { getPublishedPostById } from '~~/server/utils/public-post'
import { ok } from '~~/server/utils/response'

const bodySchema = z.object({
  postId: z.coerce.number().int().positive()
})

export default defineEventHandler(async (event) => {
  const body = bodySchema.parse(await readBody(event))
  const post = await getPublishedPostById(body.postId)

  const result = await withAiUsage(event, 'writing-assistant', async () => {
    const [categories, tags] = await Promise.all([
      prisma.category.findMany({
        orderBy: [{ name: 'asc' }],
        select: { id: true, name: true }
      }),
      prisma.tag.findMany({
        orderBy: [{ name: 'asc' }],
        select: { id: true, name: true }
      })
    ])

    return generateWritingAssistant(
      {
        title: post.title,
        summary: post.summary,
        content: post.content,
        category: post.category,
        tags: post.tags.map((item) => item.tag)
      },
      { categories, tags }
    )
  })

  return ok(result)
})
