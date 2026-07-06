import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { createTag, createTagSchema } from '~~/server/services/taxonomy/taxonomy.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = createTagSchema.parse(await readBody(event))
  const item = await createTag(body)
  return ok(item, '已创建')
})
