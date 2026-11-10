import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { aiSecretKeys } from '../types/dto/settings'

const { setting } = vi.hoisted(() => ({ setting: { findMany: vi.fn(), upsert: vi.fn() } }))
vi.mock('../server/utils/prisma', () => ({ prisma: { setting } }))
const { getAdminSettings, getAiProviderSettings, getKnowledgeAdminSettings, saveKnowledgeSettings, saveSettings } =
  await import('../server/services/settings/settings.service')

beforeEach(() => {
  vi.resetAllMocks()
  for (const key of aiSecretKeys) {
    const name = key.toUpperCase()
    for (const prefix of ['', 'NUXT_', 'NITRO_']) vi.stubEnv(prefix + name, undefined)
  }
  for (const alias of ['DEEPSEEK_API_KEY', 'OPENAI_API_KEY', 'DASHSCOPE_API_KEY']) vi.stubEnv(alias, undefined)
  setting.findMany.mockResolvedValue(aiSecretKeys.map(key => ({ key, value: 'stored-test-secret-' + key })))
})
afterEach(() => vi.unstubAllEnvs())

it('describes saved and environment-backed keys without serializing their values', async () => {
  vi.stubEnv('DEEPSEEK_API_KEY', 'environment-test-secret')
  const site = await getAdminSettings()
  const knowledge = await getKnowledgeAdminSettings()
  for (const key of aiSecretKeys) {
    expect(site).not.toHaveProperty(key)
    expect(knowledge).not.toHaveProperty(key)
  }
  expect(JSON.stringify({ site, knowledge })).not.toMatch(/(?:stored|environment)-test-secret/)
  expect(knowledge.aiSecretStatus).toEqual(site.aiSecretStatus)
  expect(site.aiSecretStatus.ai_api_key).toEqual({ stored: true, environment: true })
  expect(site.aiSecretStatus.ai_embedding_api_key).toEqual({ stored: true, environment: false })
  expect((await getAiProviderSettings()).apiKey).toBe('environment-test-secret')
})

it('preserves omitted or blank secrets and only replaces or clears explicit changes', async () => {
  await saveSettings({ site_title: 'New title' })
  await saveKnowledgeSettings({ ai_api_key: ' ', ai_embedding_api_key: ' replacement ', ai_rerank_api_key: null })

  expect(setting.upsert.mock.calls.map(([args]) => [args.where.key, args.update.value])).toEqual([
    ['site_title', 'New title'],
    ['ai_embedding_api_key', 'replacement'],
    ['ai_rerank_api_key', '']
  ])
})
