import { articleConversationListSchema, listArticleConversations } from '~~/server/services/article-chat/article-chat.service'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const input = articleConversationListSchema.parse(getQuery(event))
  return ok(await listArticleConversations(event, String(getRouterParam(event, 'slug') || ''), input))
})
