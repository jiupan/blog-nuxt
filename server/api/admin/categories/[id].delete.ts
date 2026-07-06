import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { deleteCategory } from '~~/server/services/taxonomy/taxonomy.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  await deleteCategory(id)
  return ok(true)
})
