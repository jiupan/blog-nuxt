import { generateRelatedPosts } from '../ai/related-posts-ai.service'
import { badRequest, fail } from '../../utils/api-error'
import { buildRelatedPostCandidates, type CurrentPostForRelated } from './candidate.service'
import { validateRelatedPostRecommendations } from './recommendation-validator'

export async function recommendRelatedPosts(input: CurrentPostForRelated) {
  const { current, candidates } = await buildRelatedPostCandidates(input)
  if (!candidates.length) {
    throw badRequest('暂无可推荐的已发布文章')
  }

  const result = await generateRelatedPosts(current, candidates)
  const items = validateRelatedPostRecommendations(result.items, candidates, input.postId)
  if (!items.length) {
    throw fail({
      statusCode: 502,
      statusMessage: 'AI 返回的关联文章未通过校验，请稍后重试',
      code: 'AI_RESPONSE_INVALID_SCHEMA'
    })
  }

  return { items, candidateCount: candidates.length }
}
