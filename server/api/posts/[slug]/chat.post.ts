import { articleChatInputSchema, sendArticleChatMessage } from '~~/server/services/article-chat/article-chat.service'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const input = articleChatInputSchema.parse(await readBody(event))
  return ok(await sendArticleChatMessage(event, String(getRouterParam(event, 'slug') || ''), input))
})
