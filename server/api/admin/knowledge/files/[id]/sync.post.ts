import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { queueKnowledgeFileSync } from '~~/server/services/knowledge-files/knowledge-file.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const result = await queueKnowledgeFileSync(Number(getRouterParam(event, 'id')))
  return ok(result, result.alreadyRunning ? '文件同步任务正在执行' : '文件同步任务已提交')
})
