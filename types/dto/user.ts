export type UserRolePayload = 'ADMIN' | 'USER'
export type UserStatusPayload = 'ACTIVE' | 'DISABLED'
export type UserPublicProfile = { displayName: string | null, avatarUrl: string | null }

export type SiteAccount = UserPublicProfile & {
  id: number
  username: string
  email: string | null
  pendingEmail: string | null
  emailVerifiedAt: string | null
  role: UserRolePayload
}

export type AccountSnapshot = { user: SiteAccount | null, emailAvailable: boolean }

export type AiQuota = { limit: number | null, used: number, remaining: number | null, resetsAt: string }
export type AccountUsage = { lab: AiQuota, article: AiQuota }

export type AdminUserListItem = UserPublicProfile & {
  id: number
  username: string
  email: string | null
  pendingEmail: string | null
  emailVerifiedAt: string | Date | null
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
    aiUsagePending: number
    ragQueries: number
    articleChats: number
  }
  recentAiUsage: Array<{
    id: number
    feature: string
    status: string
    createdAt: string | Date
  }>
  recentAuditLogs: AdminUserAuditItem[]
  nextAuditCursor: number | null
}

export type AdminUserAuditItem = {
  id: number
  action: string
  before: unknown
  after: unknown
  createdAt: string | Date
  operator: { id: number, username: string } | null
}
