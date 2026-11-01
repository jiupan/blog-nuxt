import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { listAgentKeys } from '~~/server/services/agent/agent-key.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return ok(await listAgentKeys())
})
