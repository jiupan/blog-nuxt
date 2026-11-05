import { prisma } from '../../utils/prisma'
import { conflict } from '../../utils/api-error'

/** 归属由调用方先校验；仅允许重试当前会话最后一条尚未成功回答的问题。 */
export async function prepareArticleChatTurn(conversationId: number, input: { message: string, retryMessageId?: number }) {
  if (!input.retryMessageId) {
    return prisma.articleChatMessage.create({ data: { conversationId, role: 'USER', content: input.message } })
  }
  const latestUser = await prisma.articleChatMessage.findFirst({
    where: { conversationId, role: 'USER' }, orderBy: { id: 'desc' }
  })
  if (!latestUser || latestUser.id !== input.retryMessageId || latestUser.content !== input.message) {
    throw conflict('会话已变化，请重新打开会话后重试')
  }
  const completed = await prisma.articleChatMessage.findFirst({
    where: { conversationId, id: { gt: latestUser.id }, role: 'ASSISTANT', status: 'COMPLETED' }
  })
  if (completed) throw conflict('该问题已有回答，请重新打开会话查看')
  return latestUser
}
