import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { knowledgeListQuerySchema, listKnowledgeDocuments } from '~~/server/services/knowledge/knowledge.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = knowledgeListQuerySchema.parse(getQuery(event))
  return ok(await listKnowledgeDocuments(query))
})
