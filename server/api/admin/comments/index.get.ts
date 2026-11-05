import { getQuery } from 'h3'
import { ok } from '~~/server/utils/response'
import { parseRequest } from '~~/server/utils/api-error'
import { requireAdmin } from '~~/server/utils/auth'
import { adminCommentListQuerySchema } from '~~/server/services/comments/comment.schema'
import { listAdminComments } from '~~/server/services/comments/comment-admin.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = parseRequest(adminCommentListQuerySchema, getQuery(event))

  return ok(await listAdminComments(query))
})
