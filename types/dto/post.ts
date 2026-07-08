import type { PaginationPayload } from '../api'
import type { TaxonomySummary } from './taxonomy'

export type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export type PostSummary = {
  id: number
  title: string
  slug: string
  summary?: string | null
  content?: string
  cover?: string | null
  status?: PostStatus
  viewCount?: number | null
  categoryId?: number | null
  category?: TaxonomySummary | null
  tags?: TaxonomySummary[]
  tagIds?: number[]
  seoTitle?: string | null
  seoDescription?: string | null
  isPinned?: boolean
  pinnedAt?: string | Date | null
  createdAt?: string | Date
  updatedAt?: string | Date
  publishedAt?: string | Date | null
}

export type PublicPostListPayload = PaginationPayload<PostSummary>

export type AdminPostListItem = PostSummary & {
  content: string
  status: PostStatus
  tags: TaxonomySummary[]
  createdAt: string | Date
  updatedAt: string | Date
}

export type AdminPostListPayload = PaginationPayload<AdminPostListItem>

export type PostRelationType = 'PREREQUISITE' | 'EXTENSION' | 'SAME_TOPIC' | 'PRACTICE' | 'BACKGROUND'
export type PostRelationSource = 'AI' | 'MANUAL'

export type PostRelationItem = {
  relatedPostId: number
  title: string
  slug: string
  type: PostRelationType
  reason: string
  source: PostRelationSource
}

export type CreatePostRequest = {
  title: string
  slug?: string
  summary?: string
  content: string
  cover?: string
  categoryId?: number | null
  tagIds?: number[]
  status: Extract<PostStatus, 'DRAFT' | 'PUBLISHED'>
  seoTitle?: string
  seoDescription?: string
  isPinned?: boolean
}

export type UpdatePostRequest = CreatePostRequest
