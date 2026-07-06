import type { Component } from 'vue'
export type {
  AskResult,
  DraftOrganizerResult,
  DraftPriority,
  LinkCheckResult,
  LinkCheckStatus,
  MonthlyReviewResult,
  RecommendResultItem,
  SemanticSearchResult,
  SeoCheckIssue,
  SeoCheckResult,
  SiteInsightsResult,
  SummaryPost,
  SummaryResult,
  WritingAssistantResult
} from '~~/types/dto/ai'

export type LabFeature = {
  id: string
  sysId: string
  title: string
  subtitle: string
  description: string
  icon: Component
  tone: string
  wide?: boolean
  tall?: boolean
  hasVisual?: boolean
}
