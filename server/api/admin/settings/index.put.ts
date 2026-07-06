import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { saveSettings } from '~~/server/services/settings/settings.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  await saveSettings(await readBody(event))
  return ok(null)
})
