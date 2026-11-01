import { getValidatedQuery } from 'h3'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { agentRecordsQuerySchema } from '~~/server/services/agent/agent.schema'
import { listAgentPublications } from '~~/server/services/agent/agent-publication.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const { page, pageSize } = await getValidatedQuery(event, agentRecordsQuerySchema.parse)
  return ok(await listAgentPublications(page, pageSize))
})
