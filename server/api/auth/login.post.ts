import argon2 from 'argon2'
import { getRequestIP, type H3Event } from 'h3'
import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { ok } from '~~/server/utils/response'

const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000
const LOGIN_ATTEMPT_LIMIT = 5

const loginAttempts = new Map<string, { count: number, resetAt: number }>()

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1)
})

function getLoginAttemptKey(event: H3Event, username: string) {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  return `${ip}:${username.trim().toLowerCase()}`
}

function assertLoginAllowed(key: string) {
  const now = Date.now()
  const attempt = loginAttempts.get(key)

  if (!attempt || attempt.resetAt <= now) {
    loginAttempts.delete(key)
    return
  }

  if (attempt.count >= LOGIN_ATTEMPT_LIMIT) {
    const retryAfterSeconds = Math.ceil((attempt.resetAt - now) / 1000)
    throw createError({
      statusCode: 429,
      statusMessage: `登录尝试过多，请 ${Math.ceil(retryAfterSeconds / 60)} 分钟后再试`
    })
  }
}

function recordFailedLogin(key: string) {
  const now = Date.now()
  const attempt = loginAttempts.get(key)

  if (!attempt || attempt.resetAt <= now) {
    loginAttempts.set(key, {
      count: 1,
      resetAt: now + LOGIN_ATTEMPT_WINDOW_MS
    })
    return
  }

  attempt.count += 1
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
    throw createError({
      statusCode: 401,
      statusMessage: '用户名或密码错误'
    })
  }

  if (user.status !== 'ACTIVE') {
    throw createError({
      statusCode: 403,
      statusMessage: '账号已被禁用'
    })
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

  loginAttempts.delete(attemptKey)

  return ok({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  })
})
