import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { listAdminTags, listAdminTagsSchema, listAllAdminTags } from '~~/server/services/taxonomy/taxonomy.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  if (!('page' in query) && !('pageSize' in query) && !('search' in query)) {
    return ok(await listAllAdminTags())
  }
  return ok(await listAdminTags(listAdminTagsSchema.parse(query)))
})
