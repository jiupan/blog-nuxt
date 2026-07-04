import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const rows = await prisma.setting.findMany()
  const settings: Record<string, string> = {}
  for (const row of rows) {
    settings[row.key] = row.value
  }
  return ok(settings)
})
