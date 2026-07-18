import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { updateUserStatusSchema, userIdSchema } from '~~/server/services/users/user.schema'
import { updateManagedUserStatus } from '~~/server/services/users/user-management.service'
import { getUserAuditContext } from '~~/server/services/users/user-audit.service'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const userId = userIdSchema.parse(getRouterParam(event, 'id'))
  const body = updateUserStatusSchema.parse(await readBody(event))
  const user = await updateManagedUserStatus({
    operatorId: admin.id,
    userId,
    status: body.status,
    context: getUserAuditContext(event)
  })
  return ok(user, '用户状态已更新')
})
