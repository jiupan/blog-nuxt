import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { updatePost, updatePostSchema } from '~~/server/services/posts/post.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = updatePostSchema.parse(await readBody(event))
  const post = await updatePost(id, body)
  return ok(post)
})
