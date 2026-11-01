import { getValidatedRouterParams, setResponseHeader } from 'h3'
import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { copyAgentKey } from '~~/server/services/agent/agent-key.service'
import { resolveAgentEncryptionSecret } from '~~/server/services/agent/agent-key-crypto'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const { id } = await getValidatedRouterParams(
    event,
    z.object({ id: z.coerce.number().int().positive() }).parse
  )
  const secret = resolveAgentEncryptionSecret(useRuntimeConfig(event).session.password)
  return ok(await copyAgentKey(id, secret, admin.id))
})
