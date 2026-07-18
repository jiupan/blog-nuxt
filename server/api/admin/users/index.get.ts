import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { adminUserListQuerySchema } from '~~/server/services/users/user.schema'
import { listAdminUsers } from '~~/server/services/users/user-query.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = adminUserListQuerySchema.parse(getQuery(event))
  return ok(await listAdminUsers(query))
})
