import argon2 from 'argon2'
import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { ok } from '~~/server/utils/response'

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const body = loginSchema.parse(await readBody(event))
  const user = await prisma.user.findUnique({
    where: { username: body.username }
  })

  if (!user || !(await argon2.verify(user.passwordHash, body.password))) {
    throw createError({
      statusCode: 401,
      statusMessage: '用户名或密码错误'
    })
  }

  await setUserSession(event, {
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  })

  return ok({
    id: user.id,
    username: user.username,
    role: user.role
  })
})
