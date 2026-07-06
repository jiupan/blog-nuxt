import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { listAdminTags } from '~~/server/services/taxonomy/taxonomy.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return ok(await listAdminTags())
})
