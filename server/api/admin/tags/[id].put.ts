import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { updateTag, updateTagSchema } from '~~/server/services/taxonomy/taxonomy.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = updateTagSchema.parse(await readBody(event))
  const item = await updateTag(id, body)
  return ok(item)
})
