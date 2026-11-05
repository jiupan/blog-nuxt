import { beforeEach, describe, expect, it, vi } from 'vitest'

const messages = vi.hoisted(() => ({ create: vi.fn(), findFirst: vi.fn() }))
vi.mock('../server/utils/prisma', () => ({ prisma: { articleChatMessage: messages } }))
const { prepareArticleChatTurn } = await import('../server/services/article-chat/article-chat-turn')

beforeEach(() => { vi.resetAllMocks() })
describe('retrying an article chat turn', () => {
  it('creates a user message for a new question', async () => {
    await prepareArticleChatTurn(5, { message: '解释一下' })
    expect(messages.create).toHaveBeenCalledWith({ data: { conversationId: 5, role: 'USER', content: '解释一下' } })
  })
  it('reuses the latest unanswered user message instead of inserting it again', async () => {
    const user = { id: 10, content: '解释一下' }
    messages.findFirst.mockResolvedValueOnce(user).mockResolvedValueOnce(null)
    expect(await prepareArticleChatTurn(5, { message: '解释一下', retryMessageId: 10 })).toBe(user)
    expect(messages.create).not.toHaveBeenCalled()
    expect(messages.findFirst.mock.calls[0]![0].where.conversationId).toBe(5)
  })
  it.each([null, { id: 11, content: '解释一下' }, { id: 10, content: '另一个问题' }])('rejects obsolete or changed turns: %j', async latest => {
    messages.findFirst.mockResolvedValueOnce(latest)
    await expect(prepareArticleChatTurn(5, { message: '解释一下', retryMessageId: 10 })).rejects.toMatchObject({ statusCode: 409 })
    expect(messages.create).not.toHaveBeenCalled()
  })
  it('does not generate a second answer when the first answer already completed', async () => {
    messages.findFirst.mockResolvedValueOnce({ id: 10, content: '解释一下' }).mockResolvedValueOnce({ id: 12 })
    await expect(prepareArticleChatTurn(5, { message: '解释一下', retryMessageId: 10 })).rejects.toMatchObject({ statusCode: 409 })
    expect(messages.create).not.toHaveBeenCalled()
  })
})
