import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { getAdminUserOverview } from '~~/server/services/users/user-query.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return ok(await getAdminUserOverview())
})
