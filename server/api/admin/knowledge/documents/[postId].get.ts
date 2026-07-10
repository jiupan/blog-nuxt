import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { getKnowledgeDocument } from '~~/server/services/knowledge/knowledge.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return ok(await getKnowledgeDocument(Number(getRouterParam(event, 'postId'))))
})
