import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { updateUserRoleSchema, userIdSchema } from '~~/server/services/users/user.schema'
import { updateManagedUserRole } from '~~/server/services/users/user-management.service'
import { getUserAuditContext } from '~~/server/services/users/user-audit.service'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const userId = userIdSchema.parse(getRouterParam(event, 'id'))
  const body = updateUserRoleSchema.parse(await readBody(event))
  const user = await updateManagedUserRole({
    operatorId: admin.id,
    userId,
    role: body.role,
    context: getUserAuditContext(event)
  })
  return ok(user, '用户角色已更新')
})
