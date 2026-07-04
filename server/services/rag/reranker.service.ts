import { prisma } from '~~/server/utils/prisma'
import type { RagSearchResult } from './retrieval.service'

type RerankConfig = {
  enabled: boolean
  apiKey: string
  baseUrl: string
  model: string
  topN: number
}

type RerankResponseItem = {
  index?: number
  relevance_score?: number
  score?: number
}

export async function resolveRerankConfig(): Promise<RerankConfig> {
  const config = useRuntimeConfig()
  const rows = await prisma.setting.findMany({
    where: {
      key: {
        in: ['ai_rerank_enabled', 'ai_rerank_api_key', 'ai_rerank_base_url', 'ai_rerank_model', 'ai_rerank_top_n']
      }
    }
  })
  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]))
  const envEnabled = process.env.AI_RERANK_ENABLED
  const envBaseUrl = process.env.AI_RERANK_BASE_URL
  const envModel = process.env.AI_RERANK_MODEL
  const envTopN = process.env.AI_RERANK_TOP_N

  return {
    enabled: parseEnabled(envEnabled ?? settings.ai_rerank_enabled ?? config.aiRerankEnabled),
    apiKey: String(config.aiRerankApiKey || settings.ai_rerank_api_key || '').trim(),
    baseUrl: normalizeBaseUrl(String(envBaseUrl ? config.aiRerankBaseUrl : (settings.ai_rerank_base_url || config.aiRerankBaseUrl)).trim()),
    model: String(envModel ? config.aiRerankModel : (settings.ai_rerank_model || config.aiRerankModel)).trim(),
    topN: normalizeTopN(envTopN ? config.aiRerankTopN : (settings.ai_rerank_top_n || config.aiRerankTopN))
  }
}

export async function rerankSearchResults(query: string, results: RagSearchResult[]) {
  if (results.length < 2) return results

  const config = await resolveRerankConfig()
  if (!config.enabled || !config.apiKey || !config.model) return results

  const candidates = results.slice(0, Math.min(results.length, Math.max(config.topN * 4, 20)))

  try {
    const endpoint = resolveRerankEndpoint(config.baseUrl)
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buildRerankRequestBody(endpoint, config.model, query, candidates, Math.min(config.topN, candidates.length)))
    })
    const payload = await response.json().catch(() => null)
    const responseResults = Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload?.output?.results)
        ? payload.output.results
        : null

    if (!response.ok || !responseResults) {
      return results
    }

    const reranked = responseResults
      .map((item: RerankResponseItem) => {
        const index = Number(item.index)
        const result = candidates[index]
        if (!Number.isInteger(index) || !result) return null
        const rerankScore = Number(item.relevance_score ?? item.score ?? 0)
        return {
          ...result,
          score: Number.isFinite(rerankScore) ? rerankScore : result.score
        }
      })
      .filter(isSearchResult)

    if (!reranked.length) return results

    const rerankedIds = new Set(reranked.map((item: RagSearchResult) => item.chunkId))
    return [
      ...reranked,
      ...results.filter((item) => !rerankedIds.has(item.chunkId))
    ]
  } catch {
    return results
  }
}

function buildRerankDocument(item: RagSearchResult) {
  return [
    `标题：${item.title}`,
    item.headingPath ? `位置：${item.headingPath}` : '',
    item.summary ? `摘要：${item.summary}` : '',
    `正文：${item.excerpt}`
  ].filter(Boolean).join('\n')
}

function parseEnabled(value: unknown) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase())
}

function normalizeTopN(value: unknown) {
  const topN = Number(value)
  if (!Number.isFinite(topN)) return 8
  return Math.min(Math.max(Math.floor(topN), 1), 20)
}

function normalizeBaseUrl(value: string) {
  return (value || 'https://api.cohere.com/v2').replace(/\/+$/, '')
}

function resolveRerankEndpoint(baseUrl: string) {
  if (baseUrl.includes('/services/rerank/') || baseUrl.endsWith('/rerank')) {
    return baseUrl
  }

  return `${baseUrl}/rerank`
}

function buildRerankRequestBody(endpoint: string, model: string, query: string, candidates: RagSearchResult[], topN: number) {
  const documents = candidates.map(buildRerankDocument)

  if (endpoint.includes('/services/rerank/')) {
    return {
      model,
      input: {
        query,
        documents
      },
      parameters: {
        top_n: topN,
        return_documents: false
      }
    }
  }

  return {
    model,
    query,
    documents,
    top_n: topN,
    return_documents: false
  }
}

function isSearchResult(value: RagSearchResult | null): value is RagSearchResult {
  return Boolean(value)
}
