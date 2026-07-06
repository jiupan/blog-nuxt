import { badRequest, fail } from '~~/server/utils/api-error'
import { getEmbeddingSettings, type EmbeddingSettings } from '~~/server/services/settings/settings.service'

export type EmbeddingConfig = EmbeddingSettings

export async function resolveEmbeddingConfig(): Promise<EmbeddingConfig> {
  return getEmbeddingSettings()
}

export async function embedTexts(texts: string[]) {
  const embeddingConfig = await resolveEmbeddingConfig()

  if (!embeddingConfig.apiKey) {
    throw fail({
      statusCode: 500,
      statusMessage: '未配置 Embedding API Key',
      code: 'AI_CONFIG_MISSING_KEY'
    })
  }

  if (embeddingConfig.dimensions !== 1536) {
    throw badRequest('当前 pgvector 表固定为 1536 维，请使用 1536 维 embedding 模型')
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
    throw fail({
      statusCode: response.status,
      statusMessage: message,
      code: 'AI_PROVIDER_REQUEST_FAILED',
      details: {
        providerStatusCode: response.status
      }
    })
  }

  const embeddings = Array.isArray(payload?.data)
    ? payload.data
        .sort((a: any, b: any) => Number(a.index) - Number(b.index))
        .map((item: any) => item.embedding)
    : []

  if (embeddings.length !== texts.length || embeddings.some((item: unknown) => !Array.isArray(item))) {
    throw fail({
      statusCode: 502,
      statusMessage: 'Embedding 返回格式不正确',
      code: 'AI_RESPONSE_INVALID_SCHEMA'
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
