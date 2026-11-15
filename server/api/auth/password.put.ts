import argon2 from 'argon2'
import { z } from 'zod'
import { requireUser } from '~~/server/utils/auth'
import { prisma } from '~~/server/utils/prisma'
import { parseRequest, unauthorized } from '~~/server/utils/api-error'
import { ok } from '~~/server/utils/response'
import { userPasswordSchema } from '~~/server/services/users/user.schema'
import { limitAccountMail } from '~~/server/services/users/account-email.service'
import { revokeUserSessions } from '~~/server/services/security/account-session.service'

const schema = z.object({ currentPassword: z.string().min(1), password: userPasswordSchema })

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  limitAccountMail(event, 'change-password', user.id)
  const body = parseRequest(schema, await readBody(event))
  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
  if (!account || !await argon2.verify(account.passwordHash, body.currentPassword)) throw unauthorized('当前密码不正确')
  const passwordHash = await argon2.hash(body.password, { type: argon2.argon2id })
  await prisma.$transaction(async tx => {
    const result = await tx.user.updateMany({
      where: { id: user.id, status: 'ACTIVE', passwordHash: account.passwordHash },
      data: { passwordHash, ...(user.emailVerifiedAt ? { pendingEmail: null } : {}) }
    })
    if (result.count !== 1) throw unauthorized()
    await revokeUserSessions(user.id, tx)
    await tx.accountEmailToken.deleteMany({ where: { userId: user.id } })
  })
  await clearUserSession(event)
  return ok(true)
})
