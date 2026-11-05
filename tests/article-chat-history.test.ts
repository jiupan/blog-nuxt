import { beforeEach, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  post: { findFirst: vi.fn() },
  articleChatConversation: { count: vi.fn(), findMany: vi.fn() }
}))
vi.mock('../server/utils/prisma', () => ({ prisma: db }))
vi.mock('../server/services/rag/ask.service', () => ({ answerBlogFromResults: vi.fn(), streamBlogAnswerFromResults: vi.fn() }))
vi.mock('../server/services/rag/retrieval.service', () => ({ searchPostChunks: vi.fn() }))
vi.mock('../server/services/settings/settings.service', () => ({ getKnowledgeRuntimeSettings: vi.fn() }))
const { listArticleConversations, articleConversationListSchema } = await import('../server/services/article-chat/article-chat.service')

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('getUserSession', vi.fn().mockResolvedValue({ user: { id: 7 } }))
  db.post.findFirst.mockResolvedValue({ id: 1 })
  db.articleChatConversation.count.mockResolvedValue(25)
  db.articleChatConversation.findMany.mockResolvedValue([])
})
it('searches the owned conversation set on the server before pagination', async () => {
  const result = await listArticleConversations({} as never, 'post', articleConversationListSchema.parse({ search: '旧会话', page: 2 }))
  const query = db.articleChatConversation.findMany.mock.calls[0]![0]
  expect(query).toMatchObject({
    skip: 20, take: 20,
    where: { postId: 1, userId: 7, messages: { some: { role: 'USER', content: { contains: '旧会话', mode: 'insensitive' } } } }
  })
  expect(db.articleChatConversation.count.mock.calls[0]![0].where).toEqual(query.where)
  expect(result.pagination.total).toBe(25)
})
