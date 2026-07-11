import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { deleteKnowledgeFile } from '~~/server/services/knowledge-files/knowledge-file.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  await deleteKnowledgeFile(Number(getRouterParam(event, 'id')))
  return ok(null, '知识文件已删除')
})
