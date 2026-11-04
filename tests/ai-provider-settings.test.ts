import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAiProviderSettings, getEmbeddingSettings, getRerankSettings } from '../server/services/settings/settings.service'

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }))
vi.mock('../server/utils/prisma', () => ({ prisma: { setting: { findMany } } }))

beforeEach(() => {
  for (const key of Object.keys(process.env)) {
    if (/^(?:(?:NUXT|NITRO)_)?AI_|^(?:DEEPSEEK|OPENAI|DASHSCOPE)_API_KEY$/.test(key)) {
      vi.stubEnv(key, undefined)
    }
  }
  findMany.mockResolvedValue([
    { key: 'ai_api_key', value: 'database-key' },
    { key: 'ai_base_url', value: 'https://database.example/' },
    { key: 'ai_model', value: 'database-chat' },
    { key: 'ai_embedding_model', value: 'database-embedding' },
    { key: 'ai_rerank_enabled', value: 'true' },
    { key: 'ai_rerank_top_n', value: '5' }
  ])
})

afterEach(() => vi.unstubAllEnvs())

describe('AI provider runtime settings', () => {
  it('applies process environment overrides to chat, embedding and rerank', async () => {
    vi.stubEnv('AI_API_KEY', 'runtime-key')
    vi.stubEnv('AI_BASE_URL', ' https://runtime.example/v1/ ')
    vi.stubEnv('NUXT_AI_MODEL', 'runtime-chat')
    vi.stubEnv('AI_EMBEDDING_MODEL', 'runtime-embedding')
    vi.stubEnv('DASHSCOPE_API_KEY', 'legacy-key')
    vi.stubEnv('AI_RERANK_ENABLED', 'false')
    vi.stubEnv('AI_RERANK_TOP_N', '30')

    await expect(getAiProviderSettings()).resolves.toEqual({
      apiKey: 'runtime-key', baseUrl: 'https://runtime.example/v1', model: 'runtime-chat'
    })
    await expect(getEmbeddingSettings()).resolves.toMatchObject({
      apiKey: 'legacy-key', model: 'runtime-embedding', dimensions: 1536
    })
    await expect(getRerankSettings()).resolves.toMatchObject({
      apiKey: 'legacy-key', enabled: false, topN: 20
    })
  })

  it('uses stored settings and defaults when environment variables are blank or absent', async () => {
    vi.stubEnv('AI_API_KEY', ' ')
    vi.stubEnv('AI_RERANK_ENABLED', '')

    await expect(getAiProviderSettings()).resolves.toEqual({
      apiKey: 'database-key', baseUrl: 'https://database.example', model: 'database-chat'
    })
    await expect(getEmbeddingSettings()).resolves.toMatchObject({
      model: 'database-embedding', dimensions: 1536
    })
    await expect(getRerankSettings()).resolves.toMatchObject({
      enabled: true, model: 'rerank-v3.5', topN: 5
    })
  })
})
