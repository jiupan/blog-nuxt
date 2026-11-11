import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  post: { count: vi.fn() },
  category: { findMany: vi.fn() },
  tag: { findMany: vi.fn() }
}))
vi.mock('../server/utils/prisma', () => ({ prisma: db }))
const { getTaxonomyOverview } = await import('../server/services/taxonomy/taxonomy-overview.service')

beforeEach(() => {
  vi.clearAllMocks()
  db.post.count.mockResolvedValue(12)
})

describe('public taxonomy overview', () => {
  it('limits category previews and applies public visibility to previews, counts and the site total', async () => {
    const items = [{ id: 1, name: 'AI', slug: 'ai', _count: { posts: 4 }, posts: [] }]
    db.category.findMany.mockResolvedValue(items)
    await expect(getTaxonomyOverview('categories')).resolves.toEqual({ items, totalPosts: 12 })

    const query = db.category.findMany.mock.calls[0]![0]
    const visibility = db.post.count.mock.calls[0]![0].where
    expect(visibility).toEqual({ status: 'PUBLISHED', publishedAt: { lte: expect.any(Date) } })
    expect(query.select.posts.where).toEqual(visibility)
    expect(query.select._count.select.posts.where).toEqual(visibility)
    expect(query.select.posts.take).toBe(10)
    expect(query.select.posts.orderBy).toEqual([{ publishedAt: 'desc' }, { id: 'desc' }])
    expect(query.orderBy).toEqual([{ sort: 'asc' }, { id: 'asc' }])
    expect(query.select.posts.select).toEqual({ id: true, title: true, slug: true })
  })

  it('flattens tag relations and limits previews without exposing draft or scheduled posts', async () => {
    const post = { id: 7, title: 'A public article', slug: 'public' }
    db.tag.findMany.mockResolvedValue([
      { id: 1, name: 'Vue', slug: 'vue', _count: { posts: 5 }, posts: [{ post }] },
      { id: 2, name: 'Empty', slug: 'empty', _count: { posts: 0 }, posts: [] }
    ])
    const result = await getTaxonomyOverview('tags')
    expect(result.items[0]!.posts).toEqual([post])
    expect(result.items[1]!.posts).toEqual([])
    expect(result.totalPosts).toBe(12)
    const query = db.tag.findMany.mock.calls[0]![0]
    const visibility = db.post.count.mock.calls[0]![0].where
    expect(query.select.posts.where).toEqual({ post: visibility })
    expect(query.select._count.select.posts.where).toEqual({ post: visibility })
    expect(query.select.posts.take).toBe(3)
    expect(query.select.posts.orderBy).toEqual([{ post: { publishedAt: 'desc' } }, { post: { id: 'desc' } }])
    expect(query.orderBy).toEqual([{ sort: 'asc' }, { id: 'asc' }])
  })
})
