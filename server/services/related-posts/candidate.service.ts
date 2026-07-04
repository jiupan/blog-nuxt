import { prisma } from '~~/server/utils/prisma'

export type CurrentPostForRelated = {
  postId?: number
  title: string
  summary?: string | null
  content: string
  categoryId?: number | null
  tagIds?: number[]
}

export type RelatedCandidatePost = {
  postId: number
  title: string
  slug: string
  summary?: string | null
  categoryName?: string | null
  tagNames: string[]
  publishedAt?: string | null
  viewCount: number
  score: number
}

export type RelatedCurrentPost = {
  title: string
  summary?: string | null
  contentExcerpt: string
  categoryName?: string | null
  tagNames: string[]
}

export async function buildRelatedPostCandidates(input: CurrentPostForRelated) {
  const now = new Date()
  const [category, tags, posts] = await Promise.all([
    input.categoryId
      ? prisma.category.findUnique({ where: { id: input.categoryId }, select: { name: true } })
      : Promise.resolve(null),
    input.tagIds?.length
      ? prisma.tag.findMany({ where: { id: { in: input.tagIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { lte: now },
        ...(input.postId ? { id: { not: input.postId } } : {})
      },
      include: {
        category: true,
        tags: { include: { tag: true } }
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' }
      ],
      take: 120
    })
  ])

  const keywordSet = new Set(extractKeywords([input.title, input.summary || '', input.content]))
  const tagIds = new Set(input.tagIds || [])
  const nowTime = Date.now()

  const candidates = posts.map((post) => {
    const candidateTagIds = post.tags.map((item) => item.tagId)
    let score = 0

    if (input.categoryId && post.categoryId === input.categoryId) {
      score += 30
    }

    const sameTagCount = candidateTagIds.filter((tagId) => tagIds.has(tagId)).length
    score += sameTagCount * 20

    for (const keyword of keywordSet) {
      if (post.title.includes(keyword)) {
        score += 25
      }

      if (post.summary?.includes(keyword)) {
        score += 15
      }
    }

    if (post.publishedAt) {
      const ageDays = Math.max(0, (nowTime - post.publishedAt.getTime()) / 86400000)
      if (ageDays <= 30) score += 8
      else if (ageDays <= 90) score += 4
    }

    if (post.viewCount >= 100) {
      score += 8
    } else if (post.viewCount >= 20) {
      score += 4
    }

    return {
      postId: post.id,
      title: post.title,
      slug: post.slug,
      summary: post.summary,
      categoryName: post.category?.name || null,
      tagNames: post.tags.map((item) => item.tag.name),
      publishedAt: post.publishedAt?.toISOString() || null,
      viewCount: post.viewCount,
      score
    }
  })

  return {
    current: {
      title: input.title,
      summary: input.summary || null,
      contentExcerpt: cleanText(input.content).slice(0, 2000),
      categoryName: category?.name || null,
      tagNames: tags.map((tag) => tag.name)
    },
    candidates: candidates
      .sort((a, b) => b.score - a.score || b.viewCount - a.viewCount || b.postId - a.postId)
      .slice(0, 40)
  }
}

function extractKeywords(values: string[]) {
  const text = cleanText(values.join(' '))
  const words = text
    .split(/[\s,，.。;；:：!！?？()[\]{}"'“”‘’、/\\|<>《》]+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2 && word.length <= 24)

  return [...new Set(words)].slice(0, 12)
}

function cleanText(content: string) {
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
