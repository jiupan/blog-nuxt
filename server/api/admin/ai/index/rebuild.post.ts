import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { rebuildPublishedPostIndex } from '~~/server/services/rag/indexer.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const result = await rebuildPublishedPostIndex()
  return ok(result, 'AI 索引已重建')
})
