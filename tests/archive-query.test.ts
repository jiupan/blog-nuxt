import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $queryRaw: vi.fn(),
    post: {
      findMany: vi.fn(),
      count: vi.fn()
    }
  }
}))

vi.mock('~~/server/utils/prisma', () => ({ prisma: prismaMock }))
vi.mock('~~/server/utils/markdown', () => ({ renderMarkdown: vi.fn() }))
vi.mock('~~/server/utils/slug', () => ({ normalizePostSlug: vi.fn((value: string) => value) }))
vi.mock('~~/server/utils/api-error', () => ({ notFound: vi.fn() }))
vi.mock('~~/server/services/related-posts/relation.service', () => ({
  getAdminPostRelations: vi.fn(),
  getPostRelations: vi.fn()
}))

const { listPublicArchive, publicArchiveQuerySchema } = await import('../server/services/posts/post-query.service')

describe('public archive query', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses ten items per page by default and validates the year', () => {
    expect(publicArchiveQuerySchema.parse({})).toMatchObject({ page: 1, pageSize: 10, category: '' })
    expect(() => publicArchiveQuerySchema.parse({ year: 1969 })).toThrow()
  })

  it('filters by category and UTC year, then sorts by publication date', async () => {
    const publishedAt = new Date('2025-08-03T10:00:00.000Z')
    prismaMock.post.findMany.mockResolvedValueOnce([{
        id: 9,
        title: 'Archive item',
        slug: 'archive-item',
        publishedAt,
        tags: [{ tag: { id: 1, name: 'Nuxt', slug: 'nuxt' } }]
      }])
    prismaMock.post.count.mockResolvedValue(21)
    prismaMock.$queryRaw.mockResolvedValue([{ year: 2026 }, { year: 2025 }])

    const result = await listPublicArchive(publicArchiveQuerySchema.parse({
      page: 2,
      pageSize: 10,
      category: 'engineering',
      year: 2025
    }))

    const itemQuery = prismaMock.post.findMany.mock.calls[0][0]
    expect(itemQuery).toMatchObject({
      where: {
        status: 'PUBLISHED',
        category: { slug: 'engineering' },
        publishedAt: {
          gte: new Date('2025-01-01T00:00:00.000Z'),
          lt: new Date('2026-01-01T00:00:00.000Z')
        }
      },
      orderBy: [
        { publishedAt: { sort: 'desc', nulls: 'last' } },
        { id: 'desc' }
      ],
      skip: 10,
      take: 10
    })
    expect(result).toMatchObject({ total: 21, page: 2, pageSize: 10, years: [2026, 2025] })
    expect(result.items[0]?.tags).toEqual([{ id: 1, name: 'Nuxt', slug: 'nuxt' }])
  })
})
