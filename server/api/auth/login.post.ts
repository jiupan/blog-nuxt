import argon2 from 'argon2'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { ok } from '~~/server/utils/response'
import { forbidden, rateLimited, unauthorized, parseRequest } from '~~/server/utils/api-error'
import { loginRateLimitPolicy } from '~~/server/services/security/security-policy'
import { publicAccount, startAccountSession } from '~~/server/services/security/account-session.service'
import { publicProfileSelect } from '~~/server/services/users/public-profile'
import {
  clearFixedWindow,
  consumeFixedWindow,
  createFixedWindowStore,
  getClientIp,
  retryAfterSeconds,
  type FixedWindowState
} from '~~/server/services/security/rate-limit.service'

const loginAttempts = createFixedWindowStore()
const ipAttempts = createFixedWindowStore()
// Match the Argon2 cost of accounts created by register and seed.
const dummyPasswordHash = '$argon2id$v=19$m=65536,t=3,p=4$QBhFLWZM9nlNuXKz6VjVDg$gllDpW7oVKLr4bK9mwyKXJCSelt+kcgpvXPCW4PEczk'

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
  admin: z.boolean().optional()
})

function rejectLoginAttempt(state: FixedWindowState): never {
  const retrySeconds = retryAfterSeconds(state.resetAt)
  throw rateLimited(`登录尝试过多，请 ${Math.ceil(retrySeconds / 60)} 分钟后再试`, {
    retryAfterSeconds: retrySeconds
  })
}

export default defineEventHandler(async (event) => {
  const body = parseRequest(loginSchema, await readBody(event))
  const ip = getClientIp(event)
  const accountKey = createHash('sha256').update(body.username.toLowerCase()).digest('hex')
  const attemptKey = `${ip}:${accountKey}`

  consumeFixedWindow(ipAttempts, ip, loginRateLimitPolicy.ipWindowMs, loginRateLimitPolicy.ipLimit, rejectLoginAttempt)
  consumeFixedWindow(loginAttempts, attemptKey, loginRateLimitPolicy.windowMs, loginRateLimitPolicy.limit, rejectLoginAttempt)

  const user = await prisma.user.findFirst({
    include: { avatar: publicProfileSelect.avatar },
    where: {
      OR: [
        { username: body.username },
        { email: body.username.toLowerCase() }
      ]
    }
  })

  const passwordMatches = await argon2.verify(user?.passwordHash ?? dummyPasswordHash, body.password)
  if (!user || !passwordMatches) {
    throw unauthorized('用户名或密码错误')
  }

  if (user.status !== 'ACTIVE') {
    throw forbidden('账号已被禁用')
  }
  if (body.admin && user.role !== 'ADMIN') throw forbidden('该账号没有后台访问权限')

  await startAccountSession(event, user)

  clearFixedWindow(loginAttempts, attemptKey)

  return ok(publicAccount(user))
})
