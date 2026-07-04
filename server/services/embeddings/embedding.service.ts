import { prisma } from '~~/server/utils/prisma'

export type EmbeddingConfig = {
  apiKey: string
  baseUrl: string
  model: string
  dimensions: number
}

export async function resolveEmbeddingConfig(): Promise<EmbeddingConfig> {
  const config = useRuntimeConfig()
  const rows = await prisma.setting.findMany({
    where: {
      key: {
        in: ['ai_embedding_api_key', 'ai_embedding_base_url', 'ai_embedding_model', 'ai_embedding_dimensions']
      }
    }
  })
  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]))
  const envBaseUrl = process.env.AI_EMBEDDING_BASE_URL
  const envModel = process.env.AI_EMBEDDING_MODEL
  const envDimensions = process.env.AI_EMBEDDING_DIMENSIONS
  const dimensions = Number(envDimensions ? config.aiEmbeddingDimensions : (settings.ai_embedding_dimensions || config.aiEmbeddingDimensions)) || 1536

  return {
    apiKey: String(config.aiEmbeddingApiKey || settings.ai_embedding_api_key || '').trim(),
    baseUrl: normalizeBaseUrl(String(envBaseUrl ? config.aiEmbeddingBaseUrl : (settings.ai_embedding_base_url || config.aiEmbeddingBaseUrl)).trim()),
    model: String(envModel ? config.aiEmbeddingModel : (settings.ai_embedding_model || config.aiEmbeddingModel)).trim(),
    dimensions
  }
}

export async function embedTexts(texts: string[]) {
  const embeddingConfig = await resolveEmbeddingConfig()

  if (!embeddingConfig.apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: '未配置 Embedding API Key'
    })
  }

  if (embeddingConfig.dimensions !== 1536) {
    throw createError({
      statusCode: 400,
      statusMessage: '当前 pgvector 表固定为 1536 维，请使用 1536 维 embedding 模型'
    })
  }

  const response = await fetch(`${embeddingConfig.baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${embeddingConfig.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: embeddingConfig.model,
      input: texts,
      dimensions: embeddingConfig.dimensions
    })
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = payload?.error?.message || 'Embedding 生成失败'
    throw createError({
      statusCode: response.status,
      statusMessage: message
    })
  }

  const embeddings = Array.isArray(payload?.data)
    ? payload.data
        .sort((a: any, b: any) => Number(a.index) - Number(b.index))
        .map((item: any) => item.embedding)
    : []

  if (embeddings.length !== texts.length || embeddings.some((item: unknown) => !Array.isArray(item))) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Embedding 返回格式不正确'
    })
  }

  return {
    config: embeddingConfig,
    embeddings: embeddings as number[][]
  }
}

export async function embedText(text: string) {
  const result = await embedTexts([text])
  return {
    config: result.config,
    embedding: result.embeddings[0]
  }
}

function normalizeBaseUrl(value: string) {
  return (value || 'https://api.openai.com/v1').replace(/\/+$/, '')
}
