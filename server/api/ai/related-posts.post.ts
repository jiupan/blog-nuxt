import { z } from 'zod'
import { withAiUsage } from '~~/server/utils/ai-usage'
import { ok } from '~~/server/utils/response'
import { getPublishedPostById } from '~~/server/utils/public-post'
import { parseRequest } from '~~/server/utils/api-error'
import { recommendRelatedPosts } from '~~/server/services/related-posts/recommendation.service'

const bodySchema = z.object({
  postId: z.coerce.number().int().positive()
})

export default defineEventHandler(async (event) => {
  const body = parseRequest(bodySchema, await readBody(event))

  const result = await withAiUsage(event, 'article-recommend', async () => {
    const post = await getPublishedPostById(body.postId)
    return recommendRelatedPosts({
      postId: post.id,
      title: post.title,
      summary: post.summary,
      content: post.content,
      categoryId: post.categoryId,
      tagIds: post.tags.map((item) => item.tagId)
    })
  })

  return ok(result)
})
