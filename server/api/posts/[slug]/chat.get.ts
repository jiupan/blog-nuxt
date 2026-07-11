import { getCurrentArticleConversation } from '~~/server/services/article-chat/article-chat.service'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => ok(await getCurrentArticleConversation(event, String(getRouterParam(event, 'slug') || ''))))
