import { getQuery } from 'h3'
import { ok } from '~~/server/utils/response'
import { setCacheControl } from '~~/server/utils/cache-control'
import { parseRequest } from '~~/server/utils/api-error'
import { commentListQuerySchema } from '~~/server/services/comments/comment.schema'
import {
  listPublicCommentThreads,
  requirePublishedPostId
} from '~~/server/services/comments/comment-query.service'
import { resolveCommentViewer } from '~~/server/services/comments/comment-identity.service'

export default defineEventHandler(async (event) => {
  // canDelete 按访问者身份算，公开响应不进共享缓存。
  setCacheControl(event, 'private-no-store')

  const postId = await requirePublishedPostId(getRouterParam(event, 'slug') || '')
  const query = parseRequest(commentListQuerySchema, getQuery(event))
  const viewer = await resolveCommentViewer(event)

  return ok(await listPublicCommentThreads(postId, query, viewer))
})
