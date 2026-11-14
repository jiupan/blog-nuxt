import { prisma } from '../../utils/prisma'
import { validationError } from '../../utils/api-error'
import { aiRuntimeSettingKeys, aiSecretKeys, type AiRuntimeValues, type AiSecretKey, type AiSecretStatuses } from '~~/types/dto/settings'
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

async function readSettings(keys: readonly SettingsKey[]) {
  const rows = await prisma.setting.findMany({
    where: {
      key: {
        in: [...keys]
      }
    }
  })
  const settings = { ...settingsDefaults } as SettingsMap
  const storedKeys = new Set<SettingsKey>()

  for (const row of rows) {
    if (isSettingsKey(row.key)) {
      settings[row.key] = row.value
      storedKeys.add(row.key)
    }
  }

  return { settings, storedKeys }
}

export async function getSettingsMap(keys: readonly SettingsKey[] = settingKeys): Promise<SettingsMap> {
  return (await readSettings(keys)).settings
}

export async function getPublicSettings(): Promise<PublicSettingsMap> {
  const settings = await getSettingsMap(publicSettingKeys)
  return pickSettings(settings, publicSettingKeys)
}

export async function getAdminSettings() {
  return describeAdminSettings(await getSettingsMap())
}

export async function getAnimatedAvatarCompression() {
  const settings = await getSettingsMap(['sidebar_avatar_webp_max_edge', 'sidebar_avatar_webp_quality'])
  const edge = settingsInputSchema.shape.sidebar_avatar_webp_max_edge.safeParse(settings.sidebar_avatar_webp_max_edge)
  const quality = settingsInputSchema.shape.sidebar_avatar_webp_quality.safeParse(settings.sidebar_avatar_webp_quality)
  return {
    maxEdge: Number(edge.success ? edge.data : settingsDefaults.sidebar_avatar_webp_max_edge),
    quality: Number(quality.success ? quality.data : settingsDefaults.sidebar_avatar_webp_quality)
  }
}

const knowledgeSettingKeys = [
  'ai_api_key', 'ai_base_url', 'ai_model',
  'ai_embedding_api_key', 'ai_embedding_base_url', 'ai_embedding_model', 'ai_embedding_dimensions',
  'ai_rerank_enabled', 'ai_rerank_api_key', 'ai_rerank_base_url', 'ai_rerank_model', 'ai_rerank_top_n',
  'rag_top_k', 'rag_context_limit', 'rag_system_prompt', 'rag_no_answer_prompt', 'rag_daily_user_limit', 'rag_ip_hourly_limit'
] as const satisfies readonly SettingsKey[]

export async function getKnowledgeAdminSettings() {
  const { settings: values, storedKeys } = await readSettings(knowledgeSettingKeys)
  const aiRuntime = Object.fromEntries(aiRuntimeSettingKeys.map((key) => {
    const env = readAiEnvironment(key, [])
    const stored = values[key].trim()
    let value = env || stored || settingsDefaults[key]
    if (key.endsWith('_url')) value = value.replace(/\/+$/, '')
    if (key === 'ai_rerank_enabled') value = String(parseEnabled(value))
    if (key === 'ai_rerank_top_n') value = String(normalizeBoundedInteger(value, 8, 1, 20))
    if (key === 'ai_embedding_dimensions') value = String(normalizeInteger(value, 1536))
    return [key, { value, source: env ? 'environment' : stored && storedKeys.has(key) ? 'database' : 'default' }]
  })) as AiRuntimeValues
  return { ...describeAdminSettings(values), aiRuntime }
}

const aiSecretAliases: Record<AiSecretKey, string[]> = {
  ai_api_key: ['DEEPSEEK_API_KEY', 'OPENAI_API_KEY'],
  ai_embedding_api_key: ['DASHSCOPE_API_KEY', 'OPENAI_API_KEY'],
  ai_rerank_api_key: ['DASHSCOPE_API_KEY']
}

function describeAdminSettings(values: SettingsMap) {
  const { ai_api_key, ai_embedding_api_key, ai_rerank_api_key, ...settings } = values
  const secrets = { ai_api_key, ai_embedding_api_key, ai_rerank_api_key }
  const aiSecretStatus = Object.fromEntries(aiSecretKeys.map(key => [key, {
    stored: Boolean(secrets[key].trim()),
    environment: Boolean(readAiEnvironment(key, aiSecretAliases[key]))
  }])) as AiSecretStatuses
  return { ...settings, aiSecretStatus }
}

export async function saveKnowledgeSettings(input: unknown) {
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  const scopedInput = Object.fromEntries(knowledgeSettingKeys.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]))
  return saveSettings(scopedInput)
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
    .filter((key) => parsed.data[key] !== '' || !aiSecretKeys.some(secret => secret === key))
    .map((key) => {
      const value = parsed.data[key] || ''
      return prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      })
    })

  await Promise.all(ops)

  const embeddingChanged = (['ai_embedding_model', 'ai_embedding_dimensions', 'ai_embedding_base_url'] as const)
    .some((key) => {
      const next = parsed.data[key]
      return next !== undefined && readAiSetting(current, key) !== readAiSetting({ ...current, [key]: next }, key)
    })
  if (embeddingChanged) {
    await Promise.all([
      prisma.knowledgeDocument.updateMany({ where: { enabled: true, indexedHash: { not: null } }, data: { status: 'STALE' } }),
      prisma.knowledgeDocument.updateMany({ where: { enabled: true, indexedHash: null }, data: { status: 'PENDING' } }),
      prisma.knowledgeFile.updateMany({ where: { enabled: true, chunkCount: { gt: 0 } }, data: { status: 'STALE' } }),
      prisma.knowledgeFile.updateMany({ where: { enabled: true, chunkCount: 0 }, data: { status: 'PENDING' } })
    ])
  }
}

export async function getAiProviderSettings(): Promise<AiProviderSettings> {
  const settings = await getSettingsMap(['ai_api_key', 'ai_base_url', 'ai_model'])

  return {
    apiKey: readAiSetting(settings, 'ai_api_key', ...aiSecretAliases.ai_api_key),
    baseUrl: readAiSetting(settings, 'ai_base_url').replace(/\/+$/, ''),
    model: readAiSetting(settings, 'ai_model')
  }
}

export async function getEmbeddingSettings(): Promise<EmbeddingSettings> {
  const settings = await getSettingsMap([
    'ai_embedding_api_key',
    'ai_embedding_base_url',
    'ai_embedding_model',
    'ai_embedding_dimensions'
  ])
  return {
    apiKey: readAiSetting(settings, 'ai_embedding_api_key', ...aiSecretAliases.ai_embedding_api_key),
    baseUrl: readAiSetting(settings, 'ai_embedding_base_url').replace(/\/+$/, ''),
    model: readAiSetting(settings, 'ai_embedding_model'),
    dimensions: normalizeInteger(readAiSetting(settings, 'ai_embedding_dimensions'), 1536)
  }
}

export async function getRerankSettings(): Promise<RerankSettings> {
  const settings = await getSettingsMap([
    'ai_rerank_enabled',
    'ai_rerank_api_key',
    'ai_rerank_base_url',
    'ai_rerank_model',
    'ai_rerank_top_n'
  ])
  return {
    enabled: parseEnabled(readAiSetting(settings, 'ai_rerank_enabled')),
    apiKey: readAiSetting(settings, 'ai_rerank_api_key', ...aiSecretAliases.ai_rerank_api_key),
    baseUrl: readAiSetting(settings, 'ai_rerank_base_url').replace(/\/+$/, ''),
    model: readAiSetting(settings, 'ai_rerank_model'),
    topN: normalizeBoundedInteger(readAiSetting(settings, 'ai_rerank_top_n'), 8, 1, 20)
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

function readAiSetting(settings: SettingsMap, key: Extract<SettingsKey, `ai_${string}`>, ...aliases: string[]) {
  return readAiEnvironment(key, aliases) || settings[key].trim() || settingsDefaults[key]
}

function readAiEnvironment(key: Extract<SettingsKey, `ai_${string}`>, aliases: string[]) {
  const name = key.toUpperCase()
  for (const envKey of [name, `NITRO_${name}`, `NUXT_${name}`, ...aliases]) {
    const value = process.env[envKey]?.trim()
    if (value) return value
  }
  return ''
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
