import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { updateCategory, updateCategorySchema } from '~~/server/services/taxonomy/taxonomy.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = updateCategorySchema.parse(await readBody(event))
  const item = await updateCategory(id, body)
  return ok(item)
})
