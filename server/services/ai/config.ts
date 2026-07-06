import { getAiProviderSettings, type AiProviderSettings } from '~~/server/services/settings/settings.service'

export type AiConfig = AiProviderSettings

export async function resolveAiConfig(): Promise<AiConfig> {
  return getAiProviderSettings()
}
