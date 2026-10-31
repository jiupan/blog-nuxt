import { beforeEach, describe, expect, it, vi } from 'vitest'

const { groupBy } = vi.hoisted(() => ({ groupBy: vi.fn() }))
vi.mock('../server/utils/prisma', () => ({ prisma: { post: { groupBy } } }))
const { getAdminPostOverview } = await import('../server/services/posts/post-overview.service')

describe('admin post overview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('counts every status and sums views across the entire collection', async () => {
    groupBy.mockResolvedValue([
      { status: 'PUBLISHED', _count: { _all: 42 }, _sum: { viewCount: 12600 } },
      { status: 'DRAFT', _count: { _all: 6 }, _sum: { viewCount: 120 } },
      { status: 'ARCHIVED', _count: { _all: 3 }, _sum: { viewCount: 500 } }
    ])
    await expect(getAdminPostOverview()).resolves.toEqual({
      total: 51,
      published: 42,
      drafts: 6,
      archived: 3,
      views: 13220
    })
    expect(groupBy).toHaveBeenCalledWith({
      by: ['status'],
      _count: { _all: true },
      _sum: { viewCount: true }
    })
  })

  it('returns zero for an empty site or an absent status', async () => {
    groupBy.mockResolvedValue([])
    await expect(getAdminPostOverview()).resolves.toEqual({
      total: 0,
      published: 0,
      drafts: 0,
      archived: 0,
      views: 0
    })
    groupBy.mockResolvedValue([{ status: 'DRAFT', _count: { _all: 2 }, _sum: { viewCount: null } }])
    await expect(getAdminPostOverview()).resolves.toEqual({
      total: 2,
      published: 0,
      drafts: 2,
      archived: 0,
      views: 0
    })
  })
})
