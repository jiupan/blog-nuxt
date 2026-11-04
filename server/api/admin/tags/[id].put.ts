import { parseRequest } from '~~/server/utils/api-error'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { updateTag, updateTagSchema } from '~~/server/services/taxonomy/taxonomy.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = parseRequest(updateTagSchema, await readBody(event))
  const item = await updateTag(id, body)
  return ok(item)
})
