import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { getKnowledgeFile } from '~~/server/services/knowledge-files/knowledge-file.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return ok(await getKnowledgeFile(Number(getRouterParam(event, 'id'))))
})
