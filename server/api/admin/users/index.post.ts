import { parseRequest } from '~~/server/utils/api-error'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { createAdminUserSchema } from '~~/server/services/users/user.schema'
import { createAdminUser } from '~~/server/services/users/user-management.service'
import { getUserAuditContext } from '~~/server/services/users/user-audit.service'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const data = parseRequest(createAdminUserSchema, await readBody(event))
  const user = await createAdminUser({
    operatorId: admin.id,
    data,
    context: getUserAuditContext(event)
  })
  return ok(user, '用户已创建')
})
