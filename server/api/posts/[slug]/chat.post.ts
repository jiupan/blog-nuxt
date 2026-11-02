import { sendArticleChatMessage } from '~~/server/services/article-chat/article-chat.service'
import { parseArticleChatInput } from '~~/server/services/article-chat/article-chat.schema'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const input = parseArticleChatInput(await readBody(event))
  return ok(await sendArticleChatMessage(event, String(getRouterParam(event, 'slug') || ''), input))
})
