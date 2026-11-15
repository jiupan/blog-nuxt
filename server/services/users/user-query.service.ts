import { Prisma } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { notFound } from '../../utils/api-error'
import type { AdminUserListQuery } from './user.schema'
import { publicProfile, publicProfileSelect } from './public-profile'

const publicUserSelect = {
  id: true,
  username: true,
  ...publicProfileSelect,
  email: true,
  pendingEmail: true,
  emailVerifiedAt: true,
  role: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect

export async function listAdminUsers(query: AdminUserListQuery) {
  const where: Prisma.UserWhereInput = {
    ...(query.search
      ? {
          OR: [
            { username: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
            { displayName: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
            { email: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
            { pendingEmail: { contains: query.search, mode: Prisma.QueryMode.insensitive } }
          ]
        }
      : {}),
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {})
  }

  const orderBy: Prisma.UserOrderByWithRelationInput = query.sort === 'createdAt_asc'
    ? { createdAt: 'asc' }
    : query.sort === 'lastLoginAt_desc'
      ? { lastLoginAt: { sort: 'desc', nulls: 'last' } }
      : query.sort === 'username_asc'
        ? { username: 'asc' }
        : { createdAt: 'desc' }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { ...publicUserSelect, _count: { select: { aiUsageLogs: true } } },
      orderBy: [orderBy, { id: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize
    }),
    prisma.user.count({ where })
  ])

  return {
    items: items.map(({ _count, updatedAt: _updatedAt, avatar, ...user }) => ({
      ...user,
      ...publicProfile({ ...user, avatar }),
      aiUsageCount: _count.aiUsageLogs
    })),
    total,
    page: query.page,
    pageSize: query.pageSize
  }
}

export async function getAdminUserOverview() {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [total, active, disabled, admins, newThisMonth, aiUsageThisMonth] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { status: 'DISABLED' } }),
    prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } }),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.aiUsageLog.count({ where: { createdAt: { gte: monthStart } } })
  ])

  return { total, active, disabled, admins, newThisMonth, aiUsageThisMonth }
}

export async function getAdminUserDetail(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect })
  if (!user) throw notFound('用户不存在')

  const [aiUsageGroups, ragQueries, articleChats, recentAiUsage, audit] = await Promise.all([
    prisma.aiUsageLog.groupBy({ by: ['status'], where: { userId }, _count: { _all: true } }),
    prisma.ragQueryLog.count({ where: { userId } }),
    prisma.articleChatConversation.count({ where: { userId } }),
    prisma.aiUsageLog.findMany({
      where: { userId },
      select: { id: true, feature: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    getAdminUserAudit(userId)
  ])

  const aiCounts = Object.fromEntries(aiUsageGroups.map(item => [item.status, item._count._all]))
  const aiUsageTotal = aiUsageGroups.reduce((sum, item) => sum + item._count._all, 0)
  const { avatar, ...details } = user

  return {
    ...details,
    ...publicProfile({ ...details, avatar }),
    stats: {
      aiUsageTotal,
      aiUsageSuccess: aiCounts.SUCCESS || 0,
      aiUsageFailed: aiCounts.FAILED || 0,
      aiUsageBlocked: aiCounts.BLOCKED || 0,
      aiUsagePending: aiCounts.PENDING || 0,
      ragQueries,
      articleChats
    },
    recentAiUsage,
    recentAuditLogs: audit.items,
    nextAuditCursor: audit.nextCursor
  }
}

export async function getAdminUserAudit(userId: number, cursor?: number) {
  const limit = 10
  const rows = await prisma.adminAuditLog.findMany({
    where: { targetUserId: userId, ...(cursor === undefined ? {} : { id: { lt: cursor } }) },
    select: {
      id: true, action: true, before: true, after: true, createdAt: true,
      operator: { select: { id: true, username: true } }
    },
    orderBy: { id: 'desc' },
    take: limit + 1
  })
  const items = rows.slice(0, limit)
  return { items, nextCursor: rows.length > limit ? (items.at(-1)?.id ?? null) : null }
}
