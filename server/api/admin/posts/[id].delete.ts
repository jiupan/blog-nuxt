import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { deletePost } from '~~/server/services/posts/post.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  await deletePost(id)
  return ok(true)
})
