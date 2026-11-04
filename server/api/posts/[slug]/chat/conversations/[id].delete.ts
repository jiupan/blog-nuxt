import { parseRequest } from '~~/server/utils/api-error'
import { z } from 'zod'
import { deleteArticleConversation } from '~~/server/services/article-chat/article-chat.service'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const id = parseRequest(z.coerce.number().int().positive(), getRouterParam(event, 'id'))
  await deleteArticleConversation(event, String(getRouterParam(event, 'slug') || ''), id)
  return ok(null, '会话已删除')
})
