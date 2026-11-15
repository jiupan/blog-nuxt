import argon2 from 'argon2'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'
import { ok } from '~~/server/utils/response'
import { conflict, rateLimited, parseRequest } from '~~/server/utils/api-error'
import { authPolicy, registerRateLimitPolicy } from '~~/server/services/security/security-policy'
import { publicAccount, startAccountSession } from '~~/server/services/security/account-session.service'
import { accountMailAvailable, sendAccountEmail } from '~~/server/services/users/account-email.service'
import { usernameSchema, userEmailSchema, userPasswordSchema } from '~~/server/services/users/user.schema'
import {
  consumeFixedWindow,
  createFixedWindowStore,
  getClientIp
} from '~~/server/services/security/rate-limit.service'

const registerAttempts = createFixedWindowStore()

const registerSchema = z.object({
  username: usernameSchema,
  email: userEmailSchema,
  password: userPasswordSchema
})

export default defineEventHandler(async (event) => {
  const body = parseRequest(registerSchema, await readBody(event))
  const email = body.email.toLowerCase()
  consumeFixedWindow(registerAttempts, getClientIp(event), registerRateLimitPolicy.windowMs, registerRateLimitPolicy.limit, () => {
    throw rateLimited('注册过于频繁，请稍后再试')
  })

  const exists = await prisma.user.findFirst({
    where: { username: body.username },
    select: { id: true }
  })

  if (exists) {
    throw conflict('用户名已被注册')
  }

  const passwordHash = await argon2.hash(body.password, {
    type: argon2.argon2id
  })

  const user = await prisma.user.create({
    data: {
      username: body.username,
      pendingEmail: email,
      passwordHash,
      role: authPolicy.userRole,
      status: 'ACTIVE'
    }
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw conflict('用户名已被注册')
    throw error
  })

  await startAccountSession(event, user)
  const emailAvailable = accountMailAvailable(event)
  const verificationSent = emailAvailable && await sendAccountEmail(event, user.id, email, 'VERIFY').then(() => true, () => false)
  return ok({ ...publicAccount(user), emailAvailable, verificationSent }, '注册成功')
})
