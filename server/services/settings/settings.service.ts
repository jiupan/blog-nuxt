import { prisma } from '~~/server/utils/prisma'
import { validationError } from '~~/server/utils/api-error'
import {
  publicSettingKeys,
  settingKeys,
  settingsDefaults,
  settingsInputSchema,
  type PublicSettingsMap,
  type SettingsKey,
  type SettingsMap
} from './settings.schema'

export type AiProviderSettings = {
  apiKey: string
  baseUrl: string
  model: string
}

export type EmbeddingSettings = AiProviderSettings & {
  dimensions: number
}

export type RerankSettings = AiProviderSettings & {
  enabled: boolean
  topN: number
}

export type KnowledgeRuntimeSettings = {
  topK: number
  contextLimit: number
  systemPrompt: string
  noAnswerPrompt: string
  dailyUserLimit: number
  ipHourlyLimit: number
}

export async function getSettingsMap(keys: readonly SettingsKey[] = settingKeys): Promise<SettingsMap> {
  const rows = await prisma.setting.findMany({
    where: {
      key: {
        in: [...keys]
      }
    }
  })
  const settings = { ...settingsDefaults } as SettingsMap

  for (const row of rows) {
    if (isSettingsKey(row.key)) {
      settings[row.key] = row.value
    }
  }

  return settings
}

export async function getPublicSettings(): Promise<PublicSettingsMap> {
  const settings = await getSettingsMap(publicSettingKeys)
  return pickSettings(settings, publicSettingKeys)
}

export async function getAdminSettings() {
  return getSettingsMap()
}

export async function saveSettings(input: unknown) {
  const parsed = settingsInputSchema.safeParse(input)
  if (!parsed.success) {
    throw validationError('设置数据不合法', {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message
      }))
    })
  }

  const current = await getSettingsMap()
  const ops = settingKeys
    .filter((key) => parsed.data[key] !== undefined)
    .map((key) => {
      const value = parsed.data[key] || ''
      return prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      })
    })

  await Promise.all(ops)

  const embeddingChanged = ['ai_embedding_model', 'ai_embedding_dimensions']
    .some((key) => parsed.data[key as SettingsKey] !== undefined && parsed.data[key as SettingsKey] !== current[key as SettingsKey])
  if (embeddingChanged) {
    await Promise.all([
      prisma.knowledgeDocument.updateMany({ where: { enabled: true, indexedHash: { not: null } }, data: { status: 'STALE' } }),
      prisma.knowledgeDocument.updateMany({ where: { enabled: true, indexedHash: null }, data: { status: 'PENDING' } })
    ])
  }
}

export async function getAiProviderSettings(): Promise<AiProviderSettings> {
  const config = useRuntimeConfig()
  const settings = await getSettingsMap(['ai_api_key', 'ai_base_url', 'ai_model'])
  const envBaseUrl = process.env.AI_BASE_URL
  const envModel = process.env.AI_MODEL

  return {
    apiKey: String(config.aiApiKey || settings.ai_api_key || '').trim(),
    baseUrl: normalizeBaseUrl(String(envBaseUrl ? config.aiBaseUrl : (settings.ai_base_url || config.aiBaseUrl)).trim(), settingsDefaults.ai_base_url),
    model: String(envModel ? config.aiModel : (settings.ai_model || config.aiModel)).trim()
  }
}

export async function getEmbeddingSettings(): Promise<EmbeddingSettings> {
  const config = useRuntimeConfig()
  const settings = await getSettingsMap([
    'ai_embedding_api_key',
    'ai_embedding_base_url',
    'ai_embedding_model',
    'ai_embedding_dimensions'
  ])
  const envBaseUrl = process.env.AI_EMBEDDING_BASE_URL
  const envModel = process.env.AI_EMBEDDING_MODEL
  const envDimensions = process.env.AI_EMBEDDING_DIMENSIONS

  return {
    apiKey: String(config.aiEmbeddingApiKey || settings.ai_embedding_api_key || '').trim(),
    baseUrl: normalizeBaseUrl(
      String(envBaseUrl ? config.aiEmbeddingBaseUrl : (settings.ai_embedding_base_url || config.aiEmbeddingBaseUrl)).trim(),
      settingsDefaults.ai_embedding_base_url
    ),
    model: String(envModel ? config.aiEmbeddingModel : (settings.ai_embedding_model || config.aiEmbeddingModel)).trim(),
    dimensions: normalizeInteger(envDimensions ? config.aiEmbeddingDimensions : (settings.ai_embedding_dimensions || config.aiEmbeddingDimensions), 1536)
  }
}

export async function getRerankSettings(): Promise<RerankSettings> {
  const config = useRuntimeConfig()
  const settings = await getSettingsMap([
    'ai_rerank_enabled',
    'ai_rerank_api_key',
    'ai_rerank_base_url',
    'ai_rerank_model',
    'ai_rerank_top_n'
  ])
  const envEnabled = process.env.AI_RERANK_ENABLED
  const envBaseUrl = process.env.AI_RERANK_BASE_URL
  const envModel = process.env.AI_RERANK_MODEL
  const envTopN = process.env.AI_RERANK_TOP_N

  return {
    enabled: parseEnabled(envEnabled ?? settings.ai_rerank_enabled ?? config.aiRerankEnabled),
    apiKey: String(config.aiRerankApiKey || settings.ai_rerank_api_key || '').trim(),
    baseUrl: normalizeBaseUrl(
      String(envBaseUrl ? config.aiRerankBaseUrl : (settings.ai_rerank_base_url || config.aiRerankBaseUrl)).trim(),
      settingsDefaults.ai_rerank_base_url
    ),
    model: String(envModel ? config.aiRerankModel : (settings.ai_rerank_model || config.aiRerankModel)).trim(),
    topN: normalizeBoundedInteger(envTopN ? config.aiRerankTopN : (settings.ai_rerank_top_n || config.aiRerankTopN), 8, 1, 20)
  }
}

export async function getKnowledgeRuntimeSettings(): Promise<KnowledgeRuntimeSettings> {
  const settings = await getSettingsMap([
    'rag_top_k', 'rag_context_limit', 'rag_system_prompt', 'rag_no_answer_prompt',
    'rag_daily_user_limit', 'rag_ip_hourly_limit'
  ])
  return {
    topK: normalizeBoundedInteger(settings.rag_top_k, 10, 1, 40),
    contextLimit: normalizeBoundedInteger(settings.rag_context_limit, 8, 1, 20),
    systemPrompt: settings.rag_system_prompt.trim() || settingsDefaults.rag_system_prompt,
    noAnswerPrompt: settings.rag_no_answer_prompt.trim() || settingsDefaults.rag_no_answer_prompt,
    dailyUserLimit: normalizeBoundedInteger(settings.rag_daily_user_limit, 20, 1, 10000),
    ipHourlyLimit: normalizeBoundedInteger(settings.rag_ip_hourly_limit, 60, 1, 100000)
  }
}

function pickSettings<const TKeys extends readonly SettingsKey[]>(settings: SettingsMap, keys: TKeys): Pick<SettingsMap, TKeys[number]> {
  return Object.fromEntries(keys.map((key) => [key, settings[key]])) as Pick<SettingsMap, TKeys[number]>
}

function isSettingsKey(key: string): key is SettingsKey {
  return settingKeys.includes(key as SettingsKey)
}

function normalizeBaseUrl(value: string, fallback: string) {
  return (value || fallback).replace(/\/+$/, '')
}

function parseEnabled(value: unknown) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase())
}

function normalizeInteger(value: unknown, fallback: number) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? Math.floor(numberValue) : fallback
}

function normalizeBoundedInteger(value: unknown, fallback: number, min: number, max: number) {
  const numberValue = normalizeInteger(value, fallback)
  return Math.min(Math.max(numberValue, min), max)
}
