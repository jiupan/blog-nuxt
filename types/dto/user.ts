export type UserRolePayload = 'ADMIN' | 'USER'
export type UserStatusPayload = 'ACTIVE' | 'DISABLED'

export type AdminUserListItem = {
  id: number
  username: string
  email: string | null
  role: UserRolePayload
  status: UserStatusPayload
  lastLoginAt: string | Date | null
  createdAt: string | Date
  aiUsageCount: number
}

export type AdminUserOverview = {
  total: number
  active: number
  disabled: number
  admins: number
  newThisMonth: number
  aiUsageThisMonth: number
}

export type AdminUserDetail = Omit<AdminUserListItem, 'aiUsageCount'> & {
  updatedAt: string | Date
  stats: {
    aiUsageTotal: number
    aiUsageSuccess: number
    aiUsageFailed: number
    aiUsageBlocked: number
    ragQueries: number
    articleChats: number
  }
  recentAiUsage: Array<{
    id: number
    feature: string
    status: string
    createdAt: string | Date
  }>
  recentAuditLogs: Array<{
    id: number
    action: string
    before: unknown
    after: unknown
    createdAt: string | Date
    operator: { id: number, username: string } | null
  }>
}
