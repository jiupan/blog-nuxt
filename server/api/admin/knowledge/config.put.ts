import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { saveKnowledgeSettings } from '~~/server/services/settings/settings.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  await saveKnowledgeSettings(await readBody(event))
  return ok(null, 'AI 模型与检索配置已保存')
})
