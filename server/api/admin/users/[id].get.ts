import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { userIdSchema } from '~~/server/services/users/user.schema'
import { getAdminUserDetail } from '~~/server/services/users/user-query.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const userId = userIdSchema.parse(getRouterParam(event, 'id'))
  return ok(await getAdminUserDetail(userId))
})
