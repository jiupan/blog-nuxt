import argon2 from 'argon2'
import { z } from 'zod'
import { parseRequest } from '~~/server/utils/api-error'
import { ok } from '~~/server/utils/response'
import { accountTokenPattern, applyAccountEmailToken, limitAccountMail } from '~~/server/services/users/account-email.service'
import { userPasswordSchema } from '~~/server/services/users/user.schema'

const token = z.string().regex(accountTokenPattern, '链接无效或已过期，请重新申请')
const schema = z.discriminatedUnion('purpose', [
  z.object({ purpose: z.literal('VERIFY'), token }),
  z.object({ purpose: z.enum(['RESET', 'INVITE']), token, password: userPasswordSchema })
])

export default defineEventHandler(async (event) => {
  limitAccountMail(event, 'use-email-link')
  const body = parseRequest(schema, await readBody(event))
  const passwordHash = body.purpose === 'VERIFY' ? undefined : await argon2.hash(body.password, { type: argon2.argon2id })
  await applyAccountEmailToken(body.token, body.purpose, passwordHash)
  return ok(true)
})
