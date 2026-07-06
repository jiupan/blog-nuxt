import type { AiRelatedPostItem } from '~~/server/services/related-posts/recommendation-validator'

export type SummaryPost = {
  title: string
  summary?: string | null
  content: string
  category?: {
    name: string
  } | null
  tags?: Array<{
    name: string
  }>
}

export type PostSummaryResult = {
  summary: string
  highlights: string[]
  audience: string
  questions: string[]
}

export type SeoMetaResult = {
  seoTitle: string
  seoDescription: string
}

export type RelatedPostsResult = {
  items: AiRelatedPostItem[]
}

export type WritingAssistantOption = {
  id: number
  name: string
}

export type WritingAssistantResult = {
  summary: string
  seoTitle: string
  seoDescription: string
  suggestedCategoryIds: number[]
  suggestedTagIds: number[]
  completionScore: number
  missingPoints: string[]
  titleSuggestions: string[]
  writingAdvice: string[]
}

export type SeoCheckAdviceResult = {
  seoTitle: string
  seoDescription: string
  fixes: string[]
  keywordSuggestions: string[]
}

export type BlogAnswerSource = {
  sourceId: number
  title: string
  slug: string
  headingPath?: string | null
  excerpt: string
}

export type BlogAnswerResult = {
  answer: string
  citationIds: number[]
}
