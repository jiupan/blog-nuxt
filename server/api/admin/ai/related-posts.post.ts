import { z } from 'zod'
import { generateRelatedPosts } from '~~/server/utils/ai'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { buildRelatedPostCandidates } from '~~/server/services/related-posts/candidate.service'
import { validateRelatedPostRecommendations } from '~~/server/services/related-posts/recommendation-validator'

const bodySchema = z.object({
  postId: z.number().int().positive().optional(),
  title: z.string().min(1),
  summary: z.string().optional().nullable(),
  content: z.string().min(1),
  categoryId: z.number().int().positive().optional().nullable(),
  tagIds: z.array(z.number().int().positive()).default([])
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = bodySchema.parse(await readBody(event))
  const { current, candidates } = await buildRelatedPostCandidates(body)

  if (!candidates.length) {
    throw createError({
      statusCode: 400,
      statusMessage: '暂无可推荐的已发布文章'
    })
  }

  const result = await generateRelatedPosts(current, candidates)
  const items = validateRelatedPostRecommendations(result.items, candidates, body.postId)

  if (!items.length) {
    throw createError({
      statusCode: 502,
      statusMessage: 'AI 返回的关联文章未通过校验，请稍后重试'
    })
  }

  return ok({
    items,
    candidateCount: candidates.length
  })
})
