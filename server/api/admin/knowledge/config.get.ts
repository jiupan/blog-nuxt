import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { getKnowledgeAdminSettings } from '~~/server/services/settings/settings.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return ok(await getKnowledgeAdminSettings())
})
