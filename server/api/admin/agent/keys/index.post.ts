import { readValidatedBody } from 'h3'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { createAgentKeySchema } from '~~/server/services/agent/agent.schema'
import { createAgentKey } from '~~/server/services/agent/agent-key.service'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const input = await readValidatedBody(event, createAgentKeySchema.parse)
  return ok(await createAgentKey(input.name, admin.id), '密钥已创建，仅本次显示完整密钥')
})
