import { parseRequest } from '~~/server/utils/api-error'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { createPost, createPostSchema } from '~~/server/services/posts/post.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = parseRequest(createPostSchema, await readBody(event))
  const post = await createPost(body)
  return ok(post, '已创建')
})
