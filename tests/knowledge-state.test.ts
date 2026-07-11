import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock, hashPostKnowledgeSourceMock } = vi.hoisted(() => ({
  prismaMock: {
    knowledgeDocument: { findUnique: vi.fn(), update: vi.fn() },
    post: { findUnique: vi.fn() },
    postChunk: { updateMany: vi.fn() }
  },
  hashPostKnowledgeSourceMock: vi.fn()
}))

vi.mock('../server/utils/prisma', () => ({ prisma: prismaMock }))
vi.mock('../server/services/rag/chunker.service', () => ({
  hashPostKnowledgeSource: hashPostKnowledgeSourceMock
}))

const { refreshKnowledgeDocumentState } = await import('../server/services/knowledge/knowledge-state.service')

describe('knowledge document state refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.post.findUnique.mockResolvedValue({ id: 1, title: '文章', tags: [] })
  })

  it('preserves a failed state while the failed source is unchanged', async () => {
    const document = { postId: 1, enabled: true, status: 'FAILED', sourceHash: 'current', indexedHash: null }
    prismaMock.knowledgeDocument.findUnique.mockResolvedValue(document)
    hashPostKnowledgeSourceMock.mockReturnValue('current')

    await expect(refreshKnowledgeDocumentState(1)).resolves.toBe(document)
    expect(prismaMock.knowledgeDocument.update).not.toHaveBeenCalled()
  })

  it('moves a failed document to pending after its source changes', async () => {
    prismaMock.knowledgeDocument.findUnique.mockResolvedValue({
      postId: 1, enabled: true, status: 'FAILED', sourceHash: 'old', indexedHash: null
    })
    hashPostKnowledgeSourceMock.mockReturnValue('new')
    prismaMock.knowledgeDocument.update.mockResolvedValue({ status: 'PENDING' })

    await refreshKnowledgeDocumentState(1)

    expect(prismaMock.knowledgeDocument.update).toHaveBeenCalledWith({
      where: { postId: 1 },
      data: { sourceHash: 'new', status: 'PENDING' }
    })
  })
})
