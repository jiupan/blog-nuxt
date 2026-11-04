import { parseRequest } from '~~/server/utils/api-error'
import { z } from 'zod'
import { archiveArticleConversation } from '~~/server/services/article-chat/article-chat.service'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const body = parseRequest(z.object({ conversationId: z.number().int().positive() }), await readBody(event))
  await archiveArticleConversation(event, String(getRouterParam(event, 'slug') || ''), body.conversationId)
  return ok(null, '对话已清空')
})
