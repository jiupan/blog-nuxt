import { readBody, setResponseStatus } from 'h3'
import { ok } from '~~/server/utils/response'
import { parseRequest } from '~~/server/utils/api-error'
import { createCommentSchema } from '~~/server/services/comments/comment.schema'
import { requirePublishedPostId } from '~~/server/services/comments/comment-query.service'
import { createComment } from '~~/server/services/comments/comment-write.service'

export default defineEventHandler(async (event) => {
  const postId = await requirePublishedPostId(getRouterParam(event, 'slug') || '')
  const input = parseRequest(createCommentSchema, await readBody(event))
  const result = await createComment(event, postId, input)

  setResponseStatus(event, result.replayed ? 200 : 201)

  return ok(
    {
      id: result.comment.id,
      status: result.comment.status,
      authorName: result.comment.authorName,
      authorKind: result.comment.authorKind,
      createdAt: result.comment.createdAt.toISOString(),
      pendingReview: result.comment.status === 'PENDING'
    },
    result.replayed
      ? '该评论已提交'
      : result.comment.status === 'PENDING'
        ? '评论已提交，等待审核'
        : '评论已发布'
  )
})
