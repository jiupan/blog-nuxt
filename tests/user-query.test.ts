import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findMany: vi.fn(), count: vi.fn() },
    aiUsageLog: { count: vi.fn() }
  }
}))

vi.mock('../server/utils/prisma', () => ({ prisma: prismaMock }))

const { getAdminUserOverview, listAdminUsers } = await import('../server/services/users/user-query.service')

describe('user query service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns paginated users without password hashes', async () => {
    prismaMock.user.findMany.mockResolvedValue([{
      id: 2,
      username: 'member',
      email: 'member@example.com',
      role: 'USER',
      status: 'ACTIVE',
      lastLoginAt: null,
      createdAt: new Date('2026-07-01'),
      updatedAt: new Date('2026-07-02'),
      _count: { aiUsageLogs: 7 }
    }])
    prismaMock.user.count.mockResolvedValue(1)

    const result = await listAdminUsers({
      page: 1,
      pageSize: 20,
      search: 'member',
      sort: 'createdAt_desc'
    })

    expect(result.items[0]).toMatchObject({ username: 'member', aiUsageCount: 7 })
    expect(result.items[0]).not.toHaveProperty('passwordHash')
    expect(result.items[0]).not.toHaveProperty('updatedAt')
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.not.objectContaining({ passwordHash: true })
    }))
  })

  it('returns dashboard user and monthly AI totals', async () => {
    prismaMock.user.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3)
    prismaMock.aiUsageLog.count.mockResolvedValue(42)

    await expect(getAdminUserOverview()).resolves.toEqual({
      total: 10,
      active: 8,
      disabled: 2,
      admins: 1,
      newThisMonth: 3,
      aiUsageThisMonth: 42
    })
  })
})
