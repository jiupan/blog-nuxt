import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { getIndexStatus } from '~~/server/services/rag/indexer.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const status = await getIndexStatus()
  return ok(status)
})
