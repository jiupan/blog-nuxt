export type KnowledgeStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'STALE' | 'FAILED' | 'DISABLED'

export type KnowledgeDocumentState = {
  id: number
  postId: number
  enabled: boolean
  status: KnowledgeStatus
  sourceHash: string
  indexedHash?: string | null
  chunkCount: number
  tokenCount: number
  embeddingModel?: string | null
  embeddingDim?: number | null
  lastIndexedAt?: string | null
  lastError?: string | null
  updatedAt: string
}

export type KnowledgeDocumentItem = KnowledgeDocumentState & {
  post: { id: number, title: string, slug: string, status: string, updatedAt: string }
}

export type KnowledgeOverview = {
  stats: { documents: number, files: number, chunks: number, tokens: number, pending: number, failed: number, todayQueries: number }
  recentJobs: KnowledgeJob[]
  recentQueries: RagQueryLog[]
}

export type KnowledgeJob = {
  id: number
  type: string
  status: string
  postId?: number | null
  totalItems: number
  completedItems: number
  successItems: number
  failedItems: number
  error?: string | null
  startedAt?: string | null
  finishedAt?: string | null
  createdAt: string
  post?: { title: string } | null
  knowledgeFile?: { name: string } | null
}

export type KnowledgeFileItem = {
  id: number
  name: string
  originalName: string
  mimeType: string
  extension: string
  size: number
  enabled: boolean
  status: KnowledgeStatus
  chunkCount: number
  tokenCount: number
  embeddingModel?: string | null
  lastIndexedAt?: string | null
  lastError?: string | null
  createdAt: string
}

export type RagQueryLog = {
  id: number
  question: string
  answer?: string | null
  status: string
  citations?: unknown
  durationMs?: number | null
  error?: string | null
  createdAt: string
  user?: { username: string } | null
}
