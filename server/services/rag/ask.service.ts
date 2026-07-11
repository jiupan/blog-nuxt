import { generateBlogAnswer } from '~~/server/utils/ai'
import { generateBlogAnswerStream } from '~~/server/services/ai/blog-answer.service'
import { searchPostChunks, type RagSearchResult } from './retrieval.service'
import { getKnowledgeRuntimeSettings } from '~~/server/services/settings/settings.service'
import type { KnowledgeRuntimeSettings } from '~~/server/services/settings/settings.service'

export type BlogAskCitation = {
  sourceType: 'POST' | 'FILE'
  postId?: number
  knowledgeFileId?: number
  title: string
  slug: string
  headingPath?: string | null
  excerpt: string
  pageNumber?: number | null
}

export async function streamBlogAnswerFromResults(
  question: string,
  results: RagSearchResult[],
  settings: Pick<KnowledgeRuntimeSettings, 'contextLimit' | 'noAnswerPrompt'>,
  options: { signal?: AbortSignal, onDelta: (text: string) => void | Promise<void> }
) {
  const sources = normalizeSources(results, settings.contextLimit)
  if (!sources.length) {
    await options.onDelta(settings.noAnswerPrompt)
    return { answer: settings.noAnswerPrompt, citations: [] as BlogAskCitation[] }
  }
  const answer = await generateBlogAnswerStream(question, sources.map((source, index) => ({
    sourceId: index + 1,
    title: source.title,
    slug: source.slug,
    headingPath: [source.headingPath, source.pageNumber ? `第 ${source.pageNumber} 页` : ''].filter(Boolean).join(' / ') || null,
    excerpt: source.excerpt
  })), options)
  const citedSources = answer.includes('没有找到足够依据') ? [] : sources.slice(0, 3)
  return {
    answer,
    citations: citedSources.map(source => ({
      postId: source.postId, sourceType: source.sourceType, knowledgeFileId: source.knowledgeFileId,
      title: source.title, slug: source.slug, headingPath: source.headingPath,
      excerpt: source.excerpt, pageNumber: source.pageNumber
    }))
  }
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
  return answerBlogFromResults(question, results, settings)
}

export async function answerBlogFromResults(
  question: string,
  results: RagSearchResult[],
  runtimeSettings?: Pick<KnowledgeRuntimeSettings, 'contextLimit' | 'noAnswerPrompt'>
): Promise<BlogAskResult> {
  const settings = runtimeSettings ?? await getKnowledgeRuntimeSettings()
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
    headingPath: [source.headingPath, source.pageNumber ? `第 ${source.pageNumber} 页` : ''].filter(Boolean).join(' / ') || null,
    excerpt: source.excerpt
  })))

  const noGrounding = answer.answer.includes('没有找到足够依据')
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
      sourceType: source.sourceType,
      knowledgeFileId: source.knowledgeFileId,
      title: source.title,
      slug: source.slug,
      headingPath: source.headingPath,
      excerpt: source.excerpt,
      pageNumber: source.pageNumber
    })),
    relatedPosts: noGrounding ? [] : buildRelatedPosts(citedSources.length ? citedSources : sources)
  }
}

function normalizeSources(results: RagSearchResult[], contextLimit: number) {
  const sourceCounts = new Map<string, number>()
  let totalLength = 0

  return results
    .filter((item) => item.excerpt.trim())
    .map((item) => ({
      ...item,
      excerpt: trimText(item.excerpt, 900)
    }))
    .filter((item) => {
      const sourceKey = item.sourceType === 'POST' ? `post:${item.postId}` : `file:${item.knowledgeFileId}`
      const count = sourceCounts.get(sourceKey) || 0
      if (count >= 3 || totalLength >= 5000) {
        return false
      }

      sourceCounts.set(sourceKey, count + 1)
      totalLength += item.excerpt.length
      return true
    })
    .slice(0, contextLimit)
}

function buildRelatedPosts(sources: RagSearchResult[]): BlogAskRelatedPost[] {
  const seen = new Set<number>()
  return sources
    .filter((source) => source.sourceType === 'POST' && source.postId !== undefined)
    .filter((source) => {
      if (seen.has(source.postId!)) {
        return false
      }

      seen.add(source.postId!)
      return true
    })
    .map((source) => ({
      id: source.postId!,
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
