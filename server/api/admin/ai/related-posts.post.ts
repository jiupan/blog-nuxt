import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { parseRequest } from '~~/server/utils/api-error'
import { recommendRelatedPosts } from '~~/server/services/related-posts/recommendation.service'

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
  const body = parseRequest(bodySchema, await readBody(event))
  return ok(await recommendRelatedPosts(body))
})
