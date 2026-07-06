import { describe, expect, it } from 'vitest'
import {
  publicSettingKeys,
  settingKeys,
  settingsDefaults,
  settingsInputSchema
} from '../server/services/settings/settings.schema'

describe('settings defaults', () => {
  it('keeps every setting key backed by a default value', () => {
    expect(settingKeys.sort()).toEqual(Object.keys(settingsDefaults).sort())
  })

  it('keeps public settings free of sensitive AI keys', () => {
    expect(publicSettingKeys).toContain('site_title')
    expect(publicSettingKeys).toContain('footer_actions')
    expect(publicSettingKeys.some((key) => key.startsWith('ai_'))).toBe(false)
  })

  it('contains expected AI fallback defaults', () => {
    expect(settingsDefaults.ai_base_url).toBe('https://api.deepseek.com')
    expect(settingsDefaults.ai_embedding_dimensions).toBe('1536')
    expect(settingsDefaults.ai_rerank_enabled).toBe('false')
  })
})

describe('settingsInputSchema', () => {
  it('accepts a partial settings update', () => {
    const parsed = settingsInputSchema.parse({
      site_title: 'My Blog',
      footer_actions: '[]',
      ai_base_url: 'https://api.example.com/v1',
      ai_embedding_dimensions: '1536',
      ai_rerank_top_n: '8'
    })

    expect(parsed).toEqual({
      site_title: 'My Blog',
      footer_actions: '[]',
      ai_base_url: 'https://api.example.com/v1',
      ai_embedding_dimensions: '1536',
      ai_rerank_top_n: '8'
    })
  })

  it('allows empty optional URL settings so admins can clear provider config', () => {
    expect(settingsInputSchema.parse({
      ai_base_url: '',
      ai_embedding_base_url: '',
      ai_rerank_base_url: ''
    })).toEqual({
      ai_base_url: '',
      ai_embedding_base_url: '',
      ai_rerank_base_url: ''
    })
  })

  it('rejects unknown keys', () => {
    const parsed = settingsInputSchema.safeParse({
      site_title: 'My Blog',
      unexpected_key: 'value'
    })

    expect(parsed.success).toBe(false)
  })

  it('rejects invalid URL settings', () => {
    const parsed = settingsInputSchema.safeParse({
      ai_base_url: 'not-a-url'
    })

    expect(parsed.success).toBe(false)
  })

  it('rejects boolean-like values outside the persisted true/false format', () => {
    expect(settingsInputSchema.safeParse({ seo_noindex: '1' }).success).toBe(false)
    expect(settingsInputSchema.safeParse({ ai_rerank_enabled: 'yes' }).success).toBe(false)
  })

  it('rejects non-string numeric settings because settings are persisted as KV strings', () => {
    const parsed = settingsInputSchema.safeParse({
      ai_embedding_dimensions: 1536,
      ai_rerank_top_n: 8
    })

    expect(parsed.success).toBe(false)
  })
})
