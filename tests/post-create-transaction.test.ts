import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Prisma } from '@prisma/client'

const { db, tx, cover, refresh, enable, queue } = vi.hoisted(() => ({
  db: {
    post: { findUnique: vi.fn(), create: vi.fn() },
    knowledgeDocument: { findUnique: vi.fn() }
  },
  tx: { post: { findUnique: vi.fn(), create: vi.fn() } },
  cover: vi.fn(),
  refresh: vi.fn(),
  enable: vi.fn(),
  queue: vi.fn()
}))
vi.mock('../server/utils/prisma', () => ({ prisma: db }))
vi.mock('../server/services/media/gallery.service', () => ({ getRandomCoverUrl: cover }))
vi.mock('../server/services/knowledge/knowledge-state.service', () => ({
  refreshKnowledgeDocumentState: refresh
}))
vi.mock('../server/services/knowledge/knowledge.service', () => ({
  setKnowledgeEnabled: enable,
  queueKnowledgePostSync: queue
}))
const { createPost } = await import('../server/services/posts/post.service')
const input = {
  title: 'Article',
  content: '# Body',
  status: 'PUBLISHED' as const,
  tagIds: [1, 1],
  isPinned: false
}

beforeEach(() => {
  vi.resetAllMocks()
  db.post.findUnique.mockResolvedValue(null)
  tx.post.findUnique.mockResolvedValue(null)
  db.post.create.mockResolvedValue({ id: 1 })
  tx.post.create.mockResolvedValue({ id: 2 })
  cover.mockResolvedValue('/uploads/random.webp')
  db.knowledgeDocument.findUnique.mockResolvedValue({ enabled: false })
  refresh.mockResolvedValue({})
})

describe('shared article creation', () => {
  it('preserves admin creation, automatic covers and knowledge settings', async () => {
    await createPost(input)
    expect(db.post.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cover: '/uploads/random.webp',
        status: 'PUBLISHED',
        publishedAt: expect.any(Date),
        tags: { create: [{ tagId: 1 }] }
      })
    })
    expect(db.knowledgeDocument.findUnique).toHaveBeenCalled()
    expect(queue).not.toHaveBeenCalled()
    expect(tx.post.create).not.toHaveBeenCalled()
  })
  it('uses the supplied transaction for both slug lookup and creation, deferring knowledge work', async () => {
    await createPost(input, tx as unknown as Prisma.TransactionClient)
    expect(tx.post.findUnique).toHaveBeenCalled()
    expect(tx.post.create).toHaveBeenCalled()
    expect(db.post.create).not.toHaveBeenCalled()
    expect(db.post.findUnique).not.toHaveBeenCalled()
    expect(db.knowledgeDocument.findUnique).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
    expect(queue).not.toHaveBeenCalled()
  })
  it('retains an explicit cover and keeps draft publication time empty', async () => {
    await createPost(
      { ...input, status: 'DRAFT', cover: '/uploads/own.webp' },
      tx as unknown as Prisma.TransactionClient
    )
    expect(cover).not.toHaveBeenCalled()
    expect(tx.post.create.mock.calls[0]![0].data).toMatchObject({
      cover: '/uploads/own.webp',
      publishedAt: null
    })
  })
})
