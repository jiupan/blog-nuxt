import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { setKnowledgeEnabled } from '~~/server/services/knowledge/knowledge.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = z.object({ enabled: z.boolean() }).parse(await readBody(event))
  return ok(await setKnowledgeEnabled(Number(getRouterParam(event, 'postId')), body.enabled))
})
