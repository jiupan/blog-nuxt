export type AgentKeySummary = {
  id: number
  name: string
  prefix: string
  createdAt: string
  revokedAt: string | null
  lastUsedAt: string | null
}

export type AgentPublicationItem = {
  id: number
  requestId: string
  title: string
  requestedStatus: 'DRAFT' | 'PUBLISHED'
  status: 'PENDING' | 'SUCCESS' | 'FAILED'
  error: string | null
  sources: Array<{ title: string; url: string }>
  createdAt: string
  updatedAt: string
  key: { name: string; prefix: string }
  post: {
    id: number
    title: string
    slug: string
    status: string
    publishedAt: string | null
  } | null
}
