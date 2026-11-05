import { ok } from '~~/server/utils/response'
import { parseRequest } from '~~/server/utils/api-error'
import { commentIdSchema } from '~~/server/services/comments/comment.schema'
import { requirePublishedPostId } from '~~/server/services/comments/comment-query.service'
import { deleteOwnComment } from '~~/server/services/comments/comment-write.service'

export default defineEventHandler(async (event) => {
  const postId = await requirePublishedPostId(getRouterParam(event, 'slug') || '')
  const commentId = parseRequest(commentIdSchema, getRouterParam(event, 'id'))
  const result = await deleteOwnComment(event, postId, commentId)

  return ok({
    id: result.id,
    deleted: true
  }, result.alreadyDeleted ? '评论已删除' : '评论已删除')
})
