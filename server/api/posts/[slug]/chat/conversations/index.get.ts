import { parseRequest } from '~~/server/utils/api-error'
import { articleConversationListSchema, listArticleConversations } from '~~/server/services/article-chat/article-chat.service'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const input = parseRequest(articleConversationListSchema, getQuery(event))
  return ok(await listArticleConversations(event, String(getRouterParam(event, 'slug') || ''), input))
})
