import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/auth'
import { badRequest, notFound, parseRequest } from '~~/server/utils/api-error'
import { prisma } from '~~/server/utils/prisma'
import { ok } from '~~/server/utils/response'
import { userIdSchema } from '~~/server/services/users/user.schema'
import { limitAccountMail, requireAccountMail, sendAccountEmail } from '~~/server/services/users/account-email.service'
import { createUserAuditLog, getUserAuditContext, USER_AUDIT_ACTIONS } from '~~/server/services/users/user-audit.service'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const userId = parseRequest(userIdSchema, getRouterParam(event, 'id'))
  const { purpose } = parseRequest(z.object({ purpose: z.enum(['RESET', 'INVITE']) }), await readBody(event))
  requireAccountMail(event)
  limitAccountMail(event, 'admin-user-email', userId)
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw notFound('用户不存在')
  if (user.status !== 'ACTIVE') throw badRequest('请先启用账号')
  const email = purpose === 'RESET'
    ? (user.emailVerifiedAt ? user.email : null)
    : (!user.lastLoginAt && !user.emailVerifiedAt ? user.pendingEmail : null)
  if (!email) throw badRequest(purpose === 'RESET' ? '账号没有已验证的邮箱' : '此账号无法重新发送邀请')
  await sendAccountEmail(event, user.id, email, purpose)
  await prisma.$transaction(tx => createUserAuditLog(tx, {
    operatorId: admin.id, targetUserId: user.id,
    action: purpose === 'RESET' ? USER_AUDIT_ACTIONS.resetSent : USER_AUDIT_ACTIONS.inviteSent,
    context: getUserAuditContext(event)
  }))
  return ok(true)
})
