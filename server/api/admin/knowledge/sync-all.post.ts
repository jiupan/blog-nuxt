import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { queueAllKnowledgeDocumentsSync } from '~~/server/services/knowledge/knowledge.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const result = await queueAllKnowledgeDocumentsSync()
  return ok(result, result.alreadyRunning ? '已有全量同步任务正在执行' : '知识库同步任务已提交')
})
