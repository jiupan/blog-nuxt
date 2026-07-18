import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { resetUserPasswordSchema, userIdSchema } from '~~/server/services/users/user.schema'
import { resetManagedUserPassword } from '~~/server/services/users/user-management.service'
import { getUserAuditContext } from '~~/server/services/users/user-audit.service'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const userId = userIdSchema.parse(getRouterParam(event, 'id'))
  const body = resetUserPasswordSchema.parse(await readBody(event))
  await resetManagedUserPassword({
    operatorId: admin.id,
    userId,
    password: body.password,
    context: getUserAuditContext(event)
  })
  return ok({ id: userId }, '密码已重置')
})
