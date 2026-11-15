import argon2 from 'argon2'
import { z } from 'zod'
import { requireUser } from '~~/server/utils/auth'
import { prisma } from '~~/server/utils/prisma'
import { badRequest, parseRequest, unauthorized } from '~~/server/utils/api-error'
import { ok } from '~~/server/utils/response'
import { limitAccountMail, requireAccountMail, sendAccountEmail } from '~~/server/services/users/account-email.service'
import { userEmailSchema } from '~~/server/services/users/user.schema'

const schema = z.object({ email: userEmailSchema.optional(), password: z.string().min(1).optional() })

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  requireAccountMail(event)
  limitAccountMail(event, 'verify-email', user.id)
  const input = parseRequest(schema, await readBody(event))
  const email = input.email?.toLowerCase() || user.pendingEmail || user.email
  if (!email) throw badRequest('请填写邮箱')
  if (user.email === email && user.emailVerifiedAt) throw badRequest('该邮箱已验证')

  if (input.email) {
    const account = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
    if (!account || !input.password || !await argon2.verify(account.passwordHash, input.password)) {
      throw unauthorized('当前密码不正确')
    }
    const updated = await prisma.user.updateMany({
      where: { id: user.id, status: 'ACTIVE', passwordHash: account.passwordHash },
      data: { pendingEmail: email }
    })
    if (updated.count !== 1) throw unauthorized()
  }
  await sendAccountEmail(event, user.id, email, 'VERIFY')
  return ok(true)
})
