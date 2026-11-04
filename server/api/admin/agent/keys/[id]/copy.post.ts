import { getRouterParams, setResponseHeader } from 'h3'
import { z } from 'zod'
import { parseRequest } from '~~/server/utils/api-error'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { copyAgentKey } from '~~/server/services/agent/agent-key.service'
import { resolveAgentEncryptionSecret } from '~~/server/services/agent/agent-key-crypto'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const { id } = parseRequest(
    z.object({ id: z.coerce.number().int().positive() }),
    getRouterParams(event)
  )
  const secret = resolveAgentEncryptionSecret(useRuntimeConfig(event).session.password)
  return ok(await copyAgentKey(id, secret, admin.id))
})
