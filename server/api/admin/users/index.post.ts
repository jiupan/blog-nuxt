import { parseRequest } from '~~/server/utils/api-error'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { createAdminUserSchema } from '~~/server/services/users/user.schema'
import { createAdminUser } from '~~/server/services/users/user-management.service'
import { getUserAuditContext } from '~~/server/services/users/user-audit.service'
import { limitAccountMail, requireAccountMail, sendAccountEmail } from '~~/server/services/users/account-email.service'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const data = parseRequest(createAdminUserSchema, await readBody(event))
  if (data.invite) {
    requireAccountMail(event)
    limitAccountMail(event, 'admin-create-invite', admin.id)
  }
  const user = await createAdminUser({
    operatorId: admin.id,
    data,
    context: getUserAuditContext(event)
  })
  const invitationSent = data.invite
    ? await sendAccountEmail(event, user.id, data.email.toLowerCase(), 'INVITE').then(() => true, () => false)
    : false
  return ok({ ...user, invitationSent }, '用户已创建')
})
