import { z } from 'zod'
import { getValidatedRouterParams } from 'h3'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { revokeAgentKey } from '~~/server/services/agent/agent-key.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { id } = await getValidatedRouterParams(
    event,
    z.object({ id: z.coerce.number().int().positive() }).parse
  )
  return ok(await revokeAgentKey(id), '密钥已停用')
})
