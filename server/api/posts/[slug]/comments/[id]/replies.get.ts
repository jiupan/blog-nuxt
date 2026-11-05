import { getQuery } from 'h3'
import { ok } from '~~/server/utils/response'
import { setCacheControl } from '~~/server/utils/cache-control'
import { parseRequest } from '~~/server/utils/api-error'
import { commentIdSchema, commentRepliesQuerySchema } from '~~/server/services/comments/comment.schema'
import {
  listPublicCommentReplies,
  requirePublishedPostId
} from '~~/server/services/comments/comment-query.service'
import { resolveCommentViewer } from '~~/server/services/comments/comment-identity.service'

export default defineEventHandler(async (event) => {
  setCacheControl(event, 'private-no-store')

  const postId = await requirePublishedPostId(getRouterParam(event, 'slug') || '')
  const threadRootId = parseRequest(commentIdSchema, getRouterParam(event, 'id'))
  const query = parseRequest(commentRepliesQuerySchema, getQuery(event))
  const viewer = await resolveCommentViewer(event)

  return ok(await listPublicCommentReplies(postId, threadRootId, query, viewer))
})
