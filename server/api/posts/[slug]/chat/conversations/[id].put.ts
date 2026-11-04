import { parseRequest } from '~~/server/utils/api-error'
import { z } from 'zod'
import { activateArticleConversation } from '~~/server/services/article-chat/article-chat.service'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const id = parseRequest(z.coerce.number().int().positive(), getRouterParam(event, 'id'))
  return ok(await activateArticleConversation(event, String(getRouterParam(event, 'slug') || ''), id))
})
