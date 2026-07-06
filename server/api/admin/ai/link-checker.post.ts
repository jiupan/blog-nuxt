import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/auth'
import { prisma } from '~~/server/utils/prisma'
import { ok } from '~~/server/utils/response'
import { notFound } from '~~/server/utils/api-error'
import { checkExternalLinks } from '~~/server/services/link-checker/link-checker.service'

const bodySchema = z.object({
  postId: z.coerce.number().int().positive()
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = bodySchema.parse(await readBody(event))

  const post = await prisma.post.findUnique({
    where: { id: body.postId },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true
    }
  })

  if (!post) {
    throw notFound('文章不存在')
  }

  const config = useRuntimeConfig()
  const result = await checkExternalLinks(post.content, config.public.siteUrl)

  return ok({
    post: {
      id: post.id,
      title: post.title,
      slug: post.slug
    },
    ...result
  })
})
