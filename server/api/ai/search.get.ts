import { z } from 'zod'
import { requireLabUser } from '~~/server/utils/ai-usage'
import { ok } from '~~/server/utils/response'
import { searchPostChunks } from '~~/server/services/rag/retrieval.service'

const querySchema = z.object({
  q: z.string().min(1),
  categoryId: z.coerce.number().int().min(1).optional(),
  tagId: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(10)
})

export default defineEventHandler(async (event) => {
  await requireLabUser(event)
  const query = querySchema.parse(getQuery(event))
  const items = await searchPostChunks({
    query: query.q,
    categoryId: query.categoryId,
    tagId: query.tagId,
    limit: query.limit
  })

  return ok({
    items,
    total: items.length
  })
})
