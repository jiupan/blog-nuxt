import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { syncKnowledgePost } from '~~/server/services/knowledge/knowledge.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const result = await syncKnowledgePost(Number(getRouterParam(event, 'postId')))
  return ok(result, result.alreadyRunning ? '文章同步任务正在执行' : '文章同步任务已提交')
})
