import { z } from 'zod'
import { withAiUsage } from '~~/server/utils/ai-usage'
import { getPublishedPostById } from '~~/server/utils/public-post'
import { ok } from '~~/server/utils/response'
import { checkExternalLinks } from '~~/server/services/link-checker/link-checker.service'

const bodySchema = z.object({
  postId: z.coerce.number().int().positive()
})

export default defineEventHandler(async (event) => {
  const body = bodySchema.parse(await readBody(event))

  const result = await withAiUsage(event, 'dead-link-checker', async () => {
    const post = await getPublishedPostById(body.postId)
    const config = useRuntimeConfig()
    const checkResult = await checkExternalLinks(post.content, config.public.siteUrl)
    return {
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug
      },
      ...checkResult
    }
  })

  return ok(result)
})
