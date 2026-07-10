import { generateBlogAnswer } from '~~/server/utils/ai'
import { searchPostChunks, type RagSearchResult } from './retrieval.service'
import { getKnowledgeRuntimeSettings } from '~~/server/services/settings/settings.service'

export type BlogAskCitation = {
  postId: number
  title: string
  slug: string
  headingPath?: string | null
  excerpt: string
}

export type BlogAskRelatedPost = {
  id: number
  title: string
  slug: string
  summary?: string | null
}

export type BlogAskResult = {
  answer: string
  citations: BlogAskCitation[]
  relatedPosts: BlogAskRelatedPost[]
}

export async function askBlog(question: string): Promise<BlogAskResult> {
  const settings = await getKnowledgeRuntimeSettings()
  const results = await searchPostChunks({
    query: question,
    limit: settings.topK
  })
  const sources = normalizeSources(results, settings.contextLimit)

  if (!sources.length) {
    return {
      answer: settings.noAnswerPrompt,
      citations: [],
      relatedPosts: []
    }
  }

  const answer = await generateBlogAnswer(question, sources.map((source, index) => ({
    sourceId: index + 1,
    title: source.title,
    slug: source.slug,
    headingPath: source.headingPath,
    excerpt: source.excerpt
  })))

  const noGrounding = answer.answer.includes('当前博客中没有找到足够依据')
  const citedSources = noGrounding
    ? []
    : answer.citationIds.length
      ? answer.citationIds
          .map((sourceId) => sources[sourceId - 1])
          .filter(isRagSearchResult)
      : sources.slice(0, 3)

  return {
    answer: answer.answer,
    citations: citedSources.map((source) => ({
      postId: source.postId,
      title: source.title,
      slug: source.slug,
      headingPath: source.headingPath,
      excerpt: source.excerpt
    })),
    relatedPosts: noGrounding ? [] : buildRelatedPosts(citedSources.length ? citedSources : sources)
  }
}

function normalizeSources(results: RagSearchResult[], contextLimit: number) {
  const postCounts = new Map<number, number>()
  let totalLength = 0

  return results
    .filter((item) => item.excerpt.trim())
    .map((item) => ({
      ...item,
      excerpt: trimText(item.excerpt, 900)
    }))
    .filter((item) => {
      const count = postCounts.get(item.postId) || 0
      if (count >= 3 || totalLength >= 5000) {
        return false
      }

      postCounts.set(item.postId, count + 1)
      totalLength += item.excerpt.length
      return true
    })
    .slice(0, contextLimit)
}

function buildRelatedPosts(sources: RagSearchResult[]): BlogAskRelatedPost[] {
  const seen = new Set<number>()
  return sources
    .filter((source) => {
      if (seen.has(source.postId)) {
        return false
      }

      seen.add(source.postId)
      return true
    })
    .map((source) => ({
      id: source.postId,
      title: source.title,
      slug: source.slug,
      summary: source.summary
    }))
    .slice(0, 5)
}

function isRagSearchResult(value: RagSearchResult | undefined): value is RagSearchResult {
  return Boolean(value)
}

function trimText(value: string, maxLength: number) {
  const text = value.replace(/\s+/g, ' ').trim()

  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength)}...`
}
