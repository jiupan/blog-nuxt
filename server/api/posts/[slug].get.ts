import { ok } from '~~/server/utils/response'
import { setCacheControl } from '~~/server/utils/cache-control'
import { getPublicPostDetail } from '~~/server/services/posts/post-query.service'

export default defineEventHandler(async (event) => {
  setCacheControl(event, 'public-content-detail')
  return ok(await getPublicPostDetail(getRouterParam(event, 'slug') || ''))
})
