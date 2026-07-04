import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { getSiteInsights } from '~~/server/services/site-insights/site-insights.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const result = await getSiteInsights()

  return ok(result)
})
