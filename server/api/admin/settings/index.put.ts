import { prisma } from '~~/server/utils/prisma'
import { ok } from '~~/server/utils/response'
import { z } from 'zod'

const bodySchema = z.record(z.string(), z.string())

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid settings data' })
  }

  const ops = Object.entries(parsed.data).map(([key, value]) =>
    prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    })
  )

  await Promise.all(ops)
  return ok(null)
})
