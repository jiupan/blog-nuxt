import { parseRequest } from '~~/server/utils/api-error'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { knowledgeFileListSchema, listKnowledgeFiles } from '~~/server/services/knowledge-files/knowledge-file.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return ok(await listKnowledgeFiles(parseRequest(knowledgeFileListSchema, getQuery(event))))
})
