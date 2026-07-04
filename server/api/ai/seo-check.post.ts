import { z } from 'zod'
import { generateSeoCheckAdvice } from '~~/server/utils/ai'
import { withAiUsage } from '~~/server/utils/ai-usage'
import { getPublishedPostById } from '~~/server/utils/public-post'
import { ok } from '~~/server/utils/response'
import { runSeoRuleCheck } from '~~/server/services/seo-check/seo-check.service'

const bodySchema = z.object({
  postId: z.coerce.number().int().positive()
})

export default defineEventHandler(async (event) => {
  const body = bodySchema.parse(await readBody(event))
  const post = await getPublishedPostById(body.postId)

  const result = await withAiUsage(event, 'seo-checker', async () => {
    const input = {
      title: post.title,
      summary: post.summary,
      content: post.content,
      categoryId: post.categoryId,
      tagIds: post.tags.map((item) => item.tagId),
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription
    }
    const ruleResult = runSeoRuleCheck(input)
    const advice = await generateSeoCheckAdvice({
      title: post.title,
      summary: post.summary,
      content: post.content,
      category: post.category,
      tags: post.tags.map((item) => item.tag),
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription
    }, ruleResult)

    return {
      ...ruleResult,
      advice
    }
  })

  return ok(result)
})
