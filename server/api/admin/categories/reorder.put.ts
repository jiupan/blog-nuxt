import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import {
  saveTaxonomyOrder,
  taxonomyOrderSchema
} from '~~/server/services/taxonomy/taxonomy-order.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const input = taxonomyOrderSchema.parse(await readBody(event))
  return ok(await saveTaxonomyOrder('category', input))
})
