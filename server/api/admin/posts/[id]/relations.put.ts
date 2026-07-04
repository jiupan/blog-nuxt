import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { relationSources, relationTypes, savePostRelations } from '~~/server/services/related-posts/relation.service'

const bodySchema = z.object({
  items: z.array(z.object({
    relatedPostId: z.number().int().positive(),
    type: z.enum(relationTypes),
    reason: z.string().max(160).optional().nullable(),
    sort: z.number().int().min(0),
    source: z.enum(relationSources).optional().default('AI')
  })).max(12).default([])
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const postId = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(postId) || postId <= 0) {
    throw createError({ statusCode: 400, statusMessage: '文章 ID 不正确' })
  }

  const body = bodySchema.parse(await readBody(event))
  const relations = await savePostRelations(postId, body.items)

  return ok(relations, '关联文章已保存')
})
