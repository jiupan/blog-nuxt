import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { getAdminPostDetail } from '~~/server/services/posts/post-query.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  return ok(await getAdminPostDetail(id))
})
