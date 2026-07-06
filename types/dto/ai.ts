export type SummaryPost = {
  id: number
  title: string
}

export type SummaryResult = {
  summary: string
  highlights: string[]
  audience: string
  questions: string[]
}

export type RecommendResultItem = {
  relatedPostId: number
  title: string
  slug: string
  type: string
  reason: string
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

export type SemanticSearchResult = {
  chunkId: number
  postId: number
  chunkIndex: number
  title: string
  slug: string
  excerpt: string
  headingPath?: string | null
  score: number
}

export type AskResult = {
  answer: string
  citations: Array<{
    postId: number
    title: string
    slug: string
    headingPath?: string | null
    excerpt: string
  }>
  relatedPosts: Array<{
    id: number
    title: string
    slug: string
    summary?: string | null
  }>
}

export type LinkCheckStatus = 'OK' | 'REDIRECT' | 'BROKEN' | 'TIMEOUT' | 'BLOCKED' | 'UNKNOWN'

export type LinkCheckResult = {
  summary: {
    total: number
    ok: number
    redirect: number
    broken: number
    timeout: number
    blocked: number
    unknown: number
  }
  items: Array<{
    url: string
    text?: string
    line: number
    status: LinkCheckStatus
    statusCode?: number
    finalUrl?: string
    error?: string
    checkedAt: string
  }>
}

export type DraftPriority = 'READY_TO_POLISH' | 'NEEDS_METADATA' | 'NEEDS_STRUCTURE' | 'EARLY_IDEA'

export type DraftOrganizerResult = {
  summary: {
    total: number
    ready: number
    needsMetadata: number
    needsStructure: number
    earlyIdea: number
  }
  items: Array<{
    id: number
    title: string
    slug: string
    updatedAt: string
    createdAt: string
    wordCount: number
    completionScore: number
    priority: DraftPriority
    missing: string[]
    suggestions: string[]
    category?: string | null
    tags: string[]
  }>
}

export type SiteInsightsResult = {
  summary: {
    totalPosts: number
    publishedPosts: number
    draftPosts: number
    archivedPosts: number
    totalViews: number
    recent30Published: number
  }
  categories: Array<{
    id: number
    name: string
    count: number
    percentage: number
  }>
  tags: Array<{
    id: number
    name: string
    count: number
  }>
  popularPosts: Array<{
    id: number
    title: string
    slug: string
    viewCount: number
  }>
  lowViewPosts: Array<{
    id: number
    title: string
    slug: string
    viewCount: number
  }>
  publishingTrend: Array<{
    label: string
    count: number
  }>
  insights: string[]
  topicSuggestions: string[]
}

export type MonthlyReviewResult = {
  month: string
  summary: {
    postCount: number
    totalViews: number
    topCategory?: string | null
    topTags: string[]
  }
  posts: Array<{
    id: number
    title: string
    slug: string
    summary?: string | null
    viewCount: number
    publishedAt: string
    category?: string | null
    tags: string[]
  }>
  highlights: string[]
  markdown: string
}

export type SeoCheckIssue = {
  key: string
  type: 'error' | 'warning' | 'success'
  title: string
  description: string
}

export type SeoCheckResult = {
  score: number
  issues: SeoCheckIssue[]
  stats: {
    wordCount: number
    h2Count: number
    imageCount: number
    missingAltCount: number
    internalLinkCount: number
    externalLinkCount: number
  }
  advice: {
    seoTitle: string
    seoDescription: string
    fixes: string[]
    keywordSuggestions: string[]
  }
}
