import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { deleteTag } from '~~/server/services/taxonomy/taxonomy.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  await deleteTag(id)
  return ok(true)
})
