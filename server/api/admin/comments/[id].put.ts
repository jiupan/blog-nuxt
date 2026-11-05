import { readBody } from 'h3'
import { ok } from '~~/server/utils/response'
import { parseRequest } from '~~/server/utils/api-error'
import { requireAdmin } from '~~/server/utils/auth'
import { commentIdSchema, moderateCommentSchema } from '~~/server/services/comments/comment.schema'
import { moderateComment } from '~~/server/services/comments/comment-moderation.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const commentId = parseRequest(commentIdSchema, getRouterParam(event, 'id'))
  const input = parseRequest(moderateCommentSchema, await readBody(event))
  const result = await moderateComment(event, commentId, input)

  return ok(
    {
      id: result.id,
      status: result.status,
      unchanged: result.unchanged
    },
    result.unchanged ? '评论状态未变化' : '评论状态已更新'
  )
})
