import { z } from 'zod'
import { getRouterParams } from 'h3'
import { parseRequest } from '~~/server/utils/api-error'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { revokeAgentKey } from '~~/server/services/agent/agent-key.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { id } = parseRequest(
    z.object({ id: z.coerce.number().int().positive() }),
    getRouterParams(event)
  )
  return ok(await revokeAgentKey(id), '密钥已停用')
})
