import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { setKnowledgeFileEnabled } from '~~/server/services/knowledge-files/knowledge-file.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = z.object({ enabled: z.boolean() }).parse(await readBody(event))
  return ok(await setKnowledgeFileEnabled(Number(getRouterParam(event, 'id')), body.enabled))
})
