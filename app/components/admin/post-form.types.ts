import type { GalleryImagePayload } from '~~/types/api'
export type { SeoCheckIssue, SeoCheckResult, WritingAssistantResult } from '~~/types/dto/ai'
export type {
  PostRelationItem,
  PostRelationSource as RelationSource,
  PostRelationType as RelationType
} from '~~/types/dto/post'
export type { TaxonomySummary as TaxonomyItem } from '~~/types/dto/taxonomy'

export type GalleryImage = GalleryImagePayload & {
  name: string
  path: string
  url: string
  size: number
  type: string
  collection: 'images' | 'covers' | 'memes'
  updatedAt: string
}
