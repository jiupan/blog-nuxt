import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { syncKnowledgePost } from '~~/server/services/knowledge/knowledge.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return ok(await syncKnowledgePost(Number(getRouterParam(event, 'postId'))), '文章知识已同步')
})
