import { requireAdmin } from '~~/server/utils/auth'
import { badRequest } from '~~/server/utils/api-error'
import { ok } from '~~/server/utils/response'
import { createKnowledgeFile } from '~~/server/services/knowledge-files/knowledge-file.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const parts = await readMultipartFormData(event)
  const file = parts?.find((part) => part.name === 'file')
  if (!file?.data) throw badRequest('请选择知识文件')
  return ok(await createKnowledgeFile({ data: file.data, filename: file.filename, type: file.type }), '知识文件已上传，正在后台同步')
})
