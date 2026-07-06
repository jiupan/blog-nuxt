import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { createCategory, createCategorySchema } from '~~/server/services/taxonomy/taxonomy.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = createCategorySchema.parse(await readBody(event))
  const item = await createCategory(body)
  return ok(item, '已创建')
})
