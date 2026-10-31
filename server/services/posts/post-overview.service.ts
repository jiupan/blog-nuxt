import { prisma } from '../../utils/prisma'

export async function getAdminPostOverview() {
  const groups = await prisma.post.groupBy({
    by: ['status'],
    _count: { _all: true },
    _sum: { viewCount: true }
  })
  const count = (status: string) => groups.find((group) => group.status === status)?._count._all || 0
  return {
    total: groups.reduce((sum, group) => sum + group._count._all, 0),
    published: count('PUBLISHED'),
    drafts: count('DRAFT'),
    archived: count('ARCHIVED'),
    views: groups.reduce((sum, group) => sum + (group._sum.viewCount || 0), 0)
  }
}
