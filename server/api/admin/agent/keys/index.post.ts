import { readValidatedBody } from 'h3'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { createAgentKeySchema } from '~~/server/services/agent/agent.schema'
import { createAgentKey } from '~~/server/services/agent/agent-key.service'
import { resolveAgentEncryptionSecret } from '~~/server/services/agent/agent-key-crypto'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const input = await readValidatedBody(event, createAgentKeySchema.parse)
  const secret = resolveAgentEncryptionSecret(useRuntimeConfig(event).session.password)
  return ok(await createAgentKey(input.name, admin.id, secret), '密钥已创建，可在密钥列表再次复制')
})
