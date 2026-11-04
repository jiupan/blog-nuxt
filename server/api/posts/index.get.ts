import { parseRequest } from '~~/server/utils/api-error'
import { ok } from '~~/server/utils/response'
import { setCacheControl } from '~~/server/utils/cache-control'
import { listPublicPosts, publicPostListQuerySchema } from '~~/server/services/posts/post-query.service'

export default defineEventHandler(async (event) => {
  const query = parseRequest(publicPostListQuerySchema, getQuery(event))
  setCacheControl(event, 'public-content')
  return ok(await listPublicPosts(query))
})
