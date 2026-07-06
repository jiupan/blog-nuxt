import argon2 from 'argon2'
import type { H3Event } from 'h3'
import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { ok } from '~~/server/utils/response'
import { conflict, rateLimited } from '~~/server/utils/api-error'
import { authPolicy, registerRateLimitPolicy } from '~~/server/services/security/security-policy'
import {
  assertFixedWindowAllowed,
  getClientIp,
  incrementFixedWindow,
  type FixedWindowStore
} from '~~/server/services/security/rate-limit.service'

const registerAttempts: FixedWindowStore = new Map()

const registerSchema = z.object({
  username: z.string()
    .trim()
    .min(3, '用户名至少需要 3 个字符')
    .max(32, '用户名不能超过 32 个字符')
    .regex(/^[a-zA-Z0-9_-]+$/, '用户名只能包含字母、数字、下划线和短横线'),
  email: z.string().trim().email('邮箱格式不正确').max(254),
  password: z.string()
    .min(12, '密码至少需要 12 位')
    .max(128, '密码不能超过 128 位')
})

function getRegisterAttemptKey(event: H3Event) {
  return getClientIp(event)
}

function assertRegisterAllowed(key: string) {
  assertFixedWindowAllowed(registerAttempts, key, registerRateLimitPolicy.limit, () => {
    throw rateLimited('注册过于频繁，请稍后再试')
  })
}

function recordRegisterAttempt(key: string) {
  incrementFixedWindow(registerAttempts, key, registerRateLimitPolicy.windowMs)
}

export default defineEventHandler(async (event) => {
  const attemptKey = getRegisterAttemptKey(event)
  assertRegisterAllowed(attemptKey)

  const body = registerSchema.parse(await readBody(event))
  const email = body.email.toLowerCase()
  recordRegisterAttempt(attemptKey)

  const exists = await prisma.user.findFirst({
    where: {
      OR: [
        { username: body.username },
        { email }
      ]
    },
    select: { id: true }
  })

  if (exists) {
    throw conflict('用户名或邮箱已被注册')
  }

  const passwordHash = await argon2.hash(body.password, {
    type: argon2.argon2id
  })

  const user = await prisma.user.create({
    data: {
      username: body.username,
      email,
      passwordHash,
      role: authPolicy.userRole,
      status: 'ACTIVE',
      lastLoginAt: new Date()
    }
  })

  await setUserSession(event, {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  })

  return ok({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  }, '注册成功')
})
