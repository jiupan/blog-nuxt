import type { Category, Post, PostTag, Tag } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

type InsightPost = Post & {
  category: Category | null
  tags: Array<PostTag & { tag: Tag }>
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

export async function getSiteInsights(): Promise<SiteInsightsResult> {
  const posts = await prisma.post.findMany({
    include: {
      category: true,
      tags: { include: { tag: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  const now = new Date()
  const publishedPosts = posts.filter((post) => post.status === 'PUBLISHED' && (!post.publishedAt || post.publishedAt <= now))
  const recent30 = new Date()
  recent30.setDate(recent30.getDate() - 30)

  const categories = buildCategoryStats(publishedPosts)
  const tags = buildTagStats(publishedPosts)
  const publishingTrend = buildPublishingTrend(publishedPosts)
  const insights = buildInsights(posts, publishedPosts, categories, tags, recent30)

  return {
    summary: {
      totalPosts: posts.length,
      publishedPosts: publishedPosts.length,
      draftPosts: posts.filter((post) => post.status === 'DRAFT').length,
      archivedPosts: posts.filter((post) => post.status === 'ARCHIVED').length,
      totalViews: publishedPosts.reduce((sum, post) => sum + post.viewCount, 0),
      recent30Published: publishedPosts.filter((post) => post.publishedAt && post.publishedAt >= recent30).length
    },
    categories,
    tags,
    popularPosts: publishedPosts
      .slice()
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5)
      .map(toPostMetric),
    lowViewPosts: publishedPosts
      .slice()
      .sort((a, b) => a.viewCount - b.viewCount)
      .slice(0, 5)
      .map(toPostMetric),
    publishingTrend,
    insights,
    topicSuggestions: buildTopicSuggestions(categories, tags, publishedPosts)
  }
}

function buildCategoryStats(posts: InsightPost[]) {
  const map = new Map<number, { id: number, name: string, count: number }>()
  posts.forEach((post) => {
    if (!post.category) return
    const current = map.get(post.category.id)
    if (current) current.count += 1
    else map.set(post.category.id, { id: post.category.id, name: post.category.name, count: 1 })
  })

  return [...map.values()]
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      ...item,
      percentage: posts.length ? Math.round((item.count / posts.length) * 100) : 0
    }))
}

function buildTagStats(posts: InsightPost[]) {
  const map = new Map<number, { id: number, name: string, count: number }>()
  posts.forEach((post) => {
    post.tags.forEach(({ tag }) => {
      const current = map.get(tag.id)
      if (current) current.count += 1
      else map.set(tag.id, { id: tag.id, name: tag.name, count: 1 })
    })
  })

  return [...map.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
}

function buildPublishingTrend(posts: InsightPost[]) {
  const buckets = Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - index))
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    return { key, label: `${date.getMonth() + 1}月`, count: 0 }
  })
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]))

  posts.forEach((post) => {
    if (!post.publishedAt) return
    const key = `${post.publishedAt.getFullYear()}-${String(post.publishedAt.getMonth() + 1).padStart(2, '0')}`
    const bucket = bucketMap.get(key)
    if (bucket) bucket.count += 1
  })

  return buckets.map(({ label, count }) => ({ label, count }))
}

function buildInsights(
  posts: InsightPost[],
  publishedPosts: InsightPost[],
  categories: ReturnType<typeof buildCategoryStats>,
  tags: ReturnType<typeof buildTagStats>,
  recent30: Date
) {
  const insights: string[] = []
  const drafts = posts.filter((post) => post.status === 'DRAFT').length
  const recentCount = publishedPosts.filter((post) => post.publishedAt && post.publishedAt >= recent30).length
  const uncategorized = publishedPosts.filter((post) => !post.categoryId).length
  const noTags = publishedPosts.filter((post) => !post.tags.length).length

  if (!publishedPosts.length) {
    return ['当前还没有已发布文章，建议先发布 3-5 篇核心主题文章再观察结构。']
  }

  if (recentCount === 0) insights.push('最近 30 天没有发布新文章，内容更新节奏可以重新拉起来。')
  else insights.push(`最近 30 天发布了 ${recentCount} 篇文章，更新节奏保持在可见状态。`)

  if (drafts > 0) insights.push(`后台还有 ${drafts} 篇草稿，可以用草稿整理助手挑选最接近发布的内容。`)

  if (categories[0] && categories[0].percentage >= 55) {
    insights.push(`“${categories[0].name}”占已发布文章 ${categories[0].percentage}%，主题集中度较高，可以补充相邻方向。`)
  }

  if (uncategorized > 0) insights.push(`有 ${uncategorized} 篇已发布文章未分类，建议补齐分类以提升归档体验。`)
  if (noTags > 0) insights.push(`有 ${noTags} 篇已发布文章没有标签，会影响搜索、相关推荐和内容聚合。`)

  if (tags.length < 5 && publishedPosts.length >= 8) {
    insights.push('标签体系还偏薄，可以把高频主题沉淀成固定标签。')
  }

  return insights.slice(0, 6)
}

function buildTopicSuggestions(
  categories: ReturnType<typeof buildCategoryStats>,
  tags: ReturnType<typeof buildTagStats>,
  publishedPosts: InsightPost[]
) {
  const suggestions: string[] = []
  const topCategory = categories[0]
  const topTags = tags.slice(0, 3).map((tag) => tag.name)

  if (topCategory) {
    suggestions.push(`围绕“${topCategory.name}”做一篇阶段性总结，把已有文章串成学习路径。`)
  }

  if (topTags.length) {
    suggestions.push(`基于 ${topTags.join(' / ')} 做一篇问题清单或最佳实践合集。`)
  }

  if (publishedPosts.some((post) => post.viewCount >= 100)) {
    suggestions.push('挑选高浏览文章补一篇进阶版或踩坑复盘，承接已有流量。')
  }

  if (publishedPosts.filter((post) => post.summary?.trim()).length < publishedPosts.length) {
    suggestions.push('补齐旧文章摘要后，可以再做一篇“近期文章导读”。')
  }

  suggestions.push('选择一个低覆盖分类补 2-3 篇基础文章，让内容结构更均衡。')

  return suggestions.slice(0, 5)
}

function toPostMetric(post: InsightPost) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    viewCount: post.viewCount
  }
}
