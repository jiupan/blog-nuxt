import type { Category, Post, PostTag, Tag } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'

type DraftPost = Post & {
  category: Category | null
  tags: Array<PostTag & { tag: Tag }>
}

export type DraftPriority = 'READY_TO_POLISH' | 'NEEDS_METADATA' | 'NEEDS_STRUCTURE' | 'EARLY_IDEA'

export type DraftOrganizerItem = {
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
}

export type DraftOrganizerResult = {
  summary: {
    total: number
    ready: number
    needsMetadata: number
    needsStructure: number
    earlyIdea: number
  }
  items: DraftOrganizerItem[]
}

export async function organizeDrafts(): Promise<DraftOrganizerResult> {
  const drafts = await prisma.post.findMany({
    where: { status: 'DRAFT' },
    include: {
      category: true,
      tags: { include: { tag: true } }
    },
    orderBy: { updatedAt: 'desc' },
    take: 50
  })

  const items = drafts
    .map(analyzeDraft)
    .sort((a, b) => b.completionScore - a.completionScore || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  return {
    summary: {
      total: items.length,
      ready: items.filter((item) => item.priority === 'READY_TO_POLISH').length,
      needsMetadata: items.filter((item) => item.priority === 'NEEDS_METADATA').length,
      needsStructure: items.filter((item) => item.priority === 'NEEDS_STRUCTURE').length,
      earlyIdea: items.filter((item) => item.priority === 'EARLY_IDEA').length
    },
    items
  }
}

function analyzeDraft(post: DraftPost): DraftOrganizerItem {
  const plainText = cleanMarkdown(post.content)
  const wordCount = countWords(plainText)
  const h2Count = (post.content.match(/^##\s+/gm) || []).length
  const imageCount = (post.content.match(/!\[[^\]]*]\([^)]+\)/g) || []).length
  const missingAltCount = (post.content.match(/!\[]\([^)]+\)/g) || []).length
  const internalLinkCount = (post.content.match(/\]\(\/[^)]+\)/g) || []).length
  const missing: string[] = []
  const suggestions: string[] = []
  let score = 10

  if (post.title.trim().length >= 6) score += 10
  else missing.push('标题还不够明确')

  if (wordCount >= 1200) score += 22
  else if (wordCount >= 600) score += 16
  else if (wordCount >= 250) score += 9
  else missing.push('正文内容还偏少')

  if (post.summary?.trim()) score += 10
  else missing.push('缺少文章摘要')

  if (post.seoTitle?.trim()) score += 8
  else missing.push('缺少 SEO 标题')

  if (post.seoDescription?.trim()) score += 8
  else missing.push('缺少 SEO 描述')

  if (post.categoryId) score += 8
  else missing.push('未选择分类')

  if (post.tags.length >= 2) score += 8
  else missing.push('标签数量不足')

  if (h2Count >= 2) score += 10
  else if (wordCount >= 600) missing.push('正文结构还不够清晰')

  if (internalLinkCount > 0) score += 6
  else if (wordCount >= 600) missing.push('缺少站内链接')

  if (imageCount === 0 || missingAltCount === 0) score += 5
  else missing.push('有图片缺少 alt 文案')

  if (wordCount < 250) {
    suggestions.push('先补齐核心观点和文章大纲，再考虑 SEO 和摘要。')
  } else if (h2Count < 2 && wordCount >= 600) {
    suggestions.push('先按二级标题拆分结构，让文章更容易阅读。')
  }

  if (!post.summary?.trim()) {
    suggestions.push('补一段 80-120 字摘要，说明文章解决什么问题。')
  }

  if (!post.seoTitle?.trim() || !post.seoDescription?.trim()) {
    suggestions.push('补齐 SEO 标题和描述，发布前可以用写作助手生成。')
  }

  if (!post.categoryId || post.tags.length < 2) {
    suggestions.push('补齐分类和标签，方便归档、搜索和相关推荐。')
  }

  if (wordCount >= 600 && internalLinkCount === 0) {
    suggestions.push('加 1-2 个站内链接，让文章和旧内容形成关联。')
  }

  const completionScore = Math.min(100, score)
  const priority = resolvePriority(completionScore, missing)

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    updatedAt: post.updatedAt.toISOString(),
    createdAt: post.createdAt.toISOString(),
    wordCount,
    completionScore,
    priority,
    missing: missing.slice(0, 6),
    suggestions: suggestions.slice(0, 4),
    category: post.category?.name || null,
    tags: post.tags.map((item) => item.tag.name)
  }
}

function resolvePriority(score: number, missing: string[]): DraftPriority {
  if (score >= 78) return 'READY_TO_POLISH'
  if (missing.some((item) => item.includes('SEO') || item.includes('摘要') || item.includes('分类') || item.includes('标签'))) {
    return 'NEEDS_METADATA'
  }
  if (score >= 45) return 'NEEDS_STRUCTURE'
  return 'EARLY_IDEA'
}

function cleanMarkdown(content: string) {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_~\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function countWords(content: string) {
  const chineseChars = content.match(/[\u4e00-\u9fa5]/g)?.length || 0
  const englishWords = content.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[a-zA-Z0-9]+/g)?.length || 0
  return chineseChars + englishWords
}
