import type { Category, Post, PostTag, Tag } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'
import { badRequest } from '~~/server/utils/api-error'

type ReviewPost = Post & {
  category: Category | null
  tags: Array<PostTag & { tag: Tag }>
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

export async function getMonthlyReview(month: string): Promise<MonthlyReviewResult> {
  const range = parseMonthRange(month)
  const posts = await prisma.post.findMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: {
        gte: range.start,
        lt: range.end
      }
    },
    include: {
      category: true,
      tags: { include: { tag: true } }
    },
    orderBy: { publishedAt: 'asc' }
  })

  const topCategory = getTopCategory(posts)
  const topTags = getTopTags(posts)
  const normalizedPosts = posts.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    viewCount: post.viewCount,
    publishedAt: post.publishedAt?.toISOString() || '',
    category: post.category?.name || null,
    tags: post.tags.map((item) => item.tag.name)
  }))
  const highlights = buildHighlights(month, posts, topCategory, topTags)

  return {
    month,
    summary: {
      postCount: posts.length,
      totalViews: posts.reduce((sum, post) => sum + post.viewCount, 0),
      topCategory,
      topTags
    },
    posts: normalizedPosts,
    highlights,
    markdown: buildMarkdown(month, normalizedPosts, highlights)
  }
}

export function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function parseMonthRange(month: string) {
  const matched = /^(\d{4})-(\d{2})$/.exec(month)
  if (!matched) {
    throw badRequest('月份格式应为 YYYY-MM')
  }

  const year = Number(matched[1])
  const monthIndex = Number(matched[2]) - 1

  if (monthIndex < 0 || monthIndex > 11) {
    throw badRequest('月份格式应为 YYYY-MM')
  }

  return {
    start: new Date(year, monthIndex, 1),
    end: new Date(year, monthIndex + 1, 1)
  }
}

function getTopCategory(posts: ReviewPost[]) {
  const map = new Map<string, number>()
  posts.forEach((post) => {
    if (!post.category?.name) return
    map.set(post.category.name, (map.get(post.category.name) || 0) + 1)
  })

  return [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null
}

function getTopTags(posts: ReviewPost[]) {
  const map = new Map<string, number>()
  posts.forEach((post) => {
    post.tags.forEach(({ tag }) => {
      map.set(tag.name, (map.get(tag.name) || 0) + 1)
    })
  })

  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name]) => name)
}

function buildHighlights(month: string, posts: ReviewPost[], topCategory: string | null, topTags: string[]) {
  if (!posts.length) {
    return [`${month} 暂无已发布文章。`]
  }

  const highlights = [`${month} 共发布 ${posts.length} 篇文章。`]
  if (topCategory) highlights.push(`本月最集中的分类是“${topCategory}”。`)
  if (topTags.length) highlights.push(`高频标签包括 ${topTags.slice(0, 4).join(' / ')}。`)

  const mostViewed = posts.slice().sort((a, b) => b.viewCount - a.viewCount)[0]
  if (mostViewed) highlights.push(`浏览最高的是《${mostViewed.title}》，当前 ${mostViewed.viewCount} 次浏览。`)

  return highlights
}

function buildMarkdown(
  month: string,
  posts: MonthlyReviewResult['posts'],
  highlights: string[]
) {
  const lines = [
    `# ${month} 内容回顾`,
    '',
    '## 本月概览',
    '',
    ...highlights.map((item) => `- ${item}`),
    '',
    '## 本月文章',
    ''
  ]

  if (!posts.length) {
    lines.push('- 本月暂无已发布文章。')
  } else {
    posts.forEach((post) => {
      lines.push(`- [${post.title}](/${post.slug})${post.summary ? `：${post.summary}` : ''}`)
    })
  }

  lines.push('', '## 下月可以继续关注', '', '- 从本月高频主题中挑选一个方向继续深入。', '- 给高浏览文章补充进阶篇或实战复盘。')

  return lines.join('\n')
}
