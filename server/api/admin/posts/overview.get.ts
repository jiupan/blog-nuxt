import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { getAdminPostOverview } from '~~/server/services/posts/post-overview.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return ok(await getAdminPostOverview())
})
