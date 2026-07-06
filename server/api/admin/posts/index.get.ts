import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { adminPostListQuerySchema, listAdminPosts } from '~~/server/services/posts/post-query.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = adminPostListQuerySchema.parse(getQuery(event))
  return ok(await listAdminPosts(query))
})
