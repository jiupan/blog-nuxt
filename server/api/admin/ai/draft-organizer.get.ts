import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { organizeDrafts } from '~~/server/services/draft-organizer/draft-organizer.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const result = await organizeDrafts()

  return ok(result)
})
