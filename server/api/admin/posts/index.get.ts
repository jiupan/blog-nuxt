import { parseRequest } from '~~/server/utils/api-error'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { adminPostListQuerySchema, listAdminPosts } from '~~/server/services/posts/post-query.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = parseRequest(adminPostListQuerySchema, getQuery(event))
  return ok(await listAdminPosts(query))
})
