import argon2 from 'argon2'
import type { H3Event } from 'h3'
import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { ok } from '~~/server/utils/response'
import { forbidden, rateLimited, unauthorized } from '~~/server/utils/api-error'
import { loginRateLimitPolicy } from '~~/server/services/security/security-policy'
import {
  assertFixedWindowAllowed,
  clearFixedWindow,
  getClientIp,
  incrementFixedWindow,
  retryAfterSeconds,
  type FixedWindowStore
} from '~~/server/services/security/rate-limit.service'

const loginAttempts: FixedWindowStore = new Map()

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1)
})

function getLoginAttemptKey(event: H3Event, username: string) {
  const ip = getClientIp(event)
  return `${ip}:${username.trim().toLowerCase()}`
}

function assertLoginAllowed(key: string) {
  assertFixedWindowAllowed(loginAttempts, key, loginRateLimitPolicy.limit, (state) => {
    const retrySeconds = retryAfterSeconds(state.resetAt)
    throw rateLimited(`登录尝试过多，请 ${Math.ceil(retrySeconds / 60)} 分钟后再试`, {
      retryAfterSeconds: retrySeconds
    })
  })
}

function recordFailedLogin(key: string) {
  incrementFixedWindow(loginAttempts, key, loginRateLimitPolicy.windowMs)
}

export default defineEventHandler(async (event) => {
  const body = loginSchema.parse(await readBody(event))
  const attemptKey = getLoginAttemptKey(event, body.username)

  assertLoginAllowed(attemptKey)

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: body.username },
        { email: body.username.toLowerCase() }
      ]
    }
  })

  if (!user || !(await argon2.verify(user.passwordHash, body.password))) {
    recordFailedLogin(attemptKey)
    throw unauthorized('用户名或密码错误')
  }

  if (user.status !== 'ACTIVE') {
    throw forbidden('账号已被禁用')
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  })

  await setUserSession(event, {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  })

  clearFixedWindow(loginAttempts, attemptKey)

  return ok({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  })
})
