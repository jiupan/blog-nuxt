import { z } from 'zod'
import { generateRelatedPosts } from '~~/server/utils/ai'
import { withAiUsage } from '~~/server/utils/ai-usage'
import { ok } from '~~/server/utils/response'
import { getPublishedPostById } from '~~/server/utils/public-post'
import { badRequest, fail } from '~~/server/utils/api-error'
import { buildRelatedPostCandidates } from '~~/server/services/related-posts/candidate.service'
import { validateRelatedPostRecommendations } from '~~/server/services/related-posts/recommendation-validator'

const bodySchema = z.object({
  postId: z.coerce.number().int().positive()
})

export default defineEventHandler(async (event) => {
  const body = bodySchema.parse(await readBody(event))

  const result = await withAiUsage(event, 'article-recommend', async () => {
    const post = await getPublishedPostById(body.postId)
    const { current, candidates } = await buildRelatedPostCandidates({
      postId: post.id,
      title: post.title,
      summary: post.summary,
      content: post.content,
      categoryId: post.categoryId,
      tagIds: post.tags.map((item) => item.tagId)
    })

    if (!candidates.length) {
      throw badRequest('暂无可推荐的已发布文章')
    }

    const aiResult = await generateRelatedPosts(current, candidates)
    const items = validateRelatedPostRecommendations(aiResult.items, candidates, post.id)

    if (!items.length) {
      throw fail({
        statusCode: 502,
        statusMessage: 'AI 返回的关联文章未通过校验，请稍后重试',
        code: 'AI_RESPONSE_INVALID_SCHEMA'
      })
    }

    return {
      items,
      candidateCount: candidates.length
    }
  })

  return ok(result)
})
