import { describe, expect, it } from 'vitest'
import { readHeaderShortcuts } from '../shared/header-shortcuts'
import { searchAboutIcons } from '../shared/about-icons'
import { emptyAboutProfile, parseAboutProfile } from '../shared/about-profile'
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
    expect(publicSettingKeys).toContain('home_post_card_style')
    expect(publicSettingKeys).toContain('header_shortcuts')
    expect(publicSettingKeys.some((key) => key.startsWith('ai_'))).toBe(false)
  })

  it('contains expected AI fallback defaults', () => {
    expect(settingsDefaults.ai_base_url).toBe('https://api.deepseek.com')
    expect(settingsDefaults.ai_embedding_dimensions).toBe('1536')
    expect(settingsDefaults.ai_rerank_enabled).toBe('false')
  })
})

describe('settingsInputSchema', () => {
  it('stores an ordered about profile with optional icons without changing site SEO', () => {
    const about_profile = JSON.stringify({
      ...emptyAboutProfile,
      name: ' Jiupan ',
      description: '第一段\n\n第二段',
      groups: [{ name: '', items: [
        { name: ' Java ', icon: 'i-simple-icons-openjdk' },
        { name: '模型评估', icon: '' }
      ] }]
    })
    const saved = settingsInputSchema.parse({ about_profile })
    expect(saved).not.toHaveProperty('seo_description')
    expect(parseAboutProfile(saved.about_profile!)).toMatchObject({
      success: true,
      data: {
        name: 'Jiupan',
        description: '第一段\n\n第二段',
        groups: [{ name: '', items: [
          { name: 'Java', icon: 'i-simple-icons-openjdk' },
          { name: '模型评估', icon: '' }
        ] }]
      }
    })
    expect(parseAboutProfile(settingsDefaults.about_profile)).toMatchObject({ success: true, data: emptyAboutProfile })
  })

  it('rejects unknown about icons and duplicate names in the same technology group', () => {
    for (const items of [
      [{ name: 'Java', icon: 'unknown' }],
      [{ name: 'Java', icon: '' }, { name: ' java ', icon: '' }]
    ]) {
      const about_profile = JSON.stringify({ ...emptyAboutProfile, groups: [{ name: '', items }] })
      expect(settingsInputSchema.safeParse({ about_profile }).success).toBe(false)
    }
    expect(searchAboutIcons('Java')[0]?.name).toBe('i-simple-icons-openjdk')
    expect(searchAboutIcons('人工智能')[0]?.name).toBe('i-lucide-brain-circuit')
    expect(searchAboutIcons('Python')[0]?.name).toBe('i-simple-icons-python')
  })

  it('persists ordered header shortcuts even when every item is hidden', () => {
    const shortcuts = readHeaderShortcuts().reverse().map(item => ({ ...item, enabled: false }))
    const header_shortcuts = JSON.stringify(shortcuts)
    expect(settingsInputSchema.parse({ header_shortcuts })).toEqual({ header_shortcuts })
    expect(readHeaderShortcuts(header_shortcuts)).toEqual(shortcuts)
    expect(readHeaderShortcuts().map(item => item.id)).toEqual(['tools', 'archive', 'account', 'search', 'theme'])
  })

  it('rejects duplicate actions and unknown icons while falling back for malformed stored data', () => {
    const shortcuts = readHeaderShortcuts()
    const first = shortcuts[0]!
    const duplicate = JSON.stringify([first, ...shortcuts.slice(0, 4)])
    const invalidIcon = JSON.stringify([{ ...first, icon: 'unknown' }, ...shortcuts.slice(1)])
    for (const header_shortcuts of [duplicate, invalidIcon, '[]', 'broken json']) {
      expect(settingsInputSchema.safeParse({ header_shortcuts }).success).toBe(false)
      expect(readHeaderShortcuts(header_shortcuts)).toEqual(shortcuts)
    }
  })

  it('accepts bounded integer strings for private animated avatar compression settings', () => {
    const settings = { sidebar_avatar_webp_max_edge: '320', sidebar_avatar_webp_quality: '70' }
    expect(settingsInputSchema.parse(settings)).toEqual(settings)
    expect(publicSettingKeys).not.toContain('sidebar_avatar_webp_max_edge')
    expect(publicSettingKeys).not.toContain('sidebar_avatar_webp_quality')
    expect(settingsInputSchema.safeParse({ ...settings, sidebar_avatar_webp_max_edge: '513' }).success).toBe(false)
    expect(settingsInputSchema.safeParse({ ...settings, sidebar_avatar_webp_quality: '70.5' }).success).toBe(false)
  })

  it('accepts ICP settings and preserves explicit clearing of footer information', () => {
    expect(settingsInputSchema.parse({ footer_icp: ' 备案号示例 ' })).toEqual({ footer_icp: '备案号示例' })
    expect(publicSettingKeys).toContain('footer_icp')
    expect(settingsDefaults.footer_icp).toBe('')
    expect(settingsInputSchema.parse({ footer_icp: '', footer_copyright: '', footer_bottom_links: '' })).toEqual({
      footer_icp: '', footer_copyright: '', footer_bottom_links: ''
    })
  })

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

  it('validates the footer reading switch and its optional featured post ID', () => {
    expect(settingsDefaults.footer_reading_enabled).toBe('true')
    expect(settingsInputSchema.parse({ footer_reading_enabled: 'false', footer_featured_post_id: '' }))
      .toEqual({ footer_reading_enabled: 'false', footer_featured_post_id: '' })
    expect(settingsInputSchema.parse({ footer_featured_post_id: '123' })).toEqual({ footer_featured_post_id: '123' })
    for (const footer_featured_post_id of ['0', '-1', '1.5', '2147483648', 'draft']) {
      expect(settingsInputSchema.safeParse({ footer_featured_post_id }).success).toBe(false)
    }
    expect(settingsInputSchema.safeParse({ footer_reading_enabled: 'yes' }).success).toBe(false)
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

  it('only accepts supported home post card styles', () => {
    expect(settingsInputSchema.safeParse({ home_post_card_style: 'archive' }).success).toBe(true)
    expect(settingsInputSchema.safeParse({ home_post_card_style: 'magazine' }).success).toBe(false)
  })

  it('rejects non-string numeric settings because settings are persisted as KV strings', () => {
    const parsed = settingsInputSchema.safeParse({
      ai_embedding_dimensions: 1536,
      ai_rerank_top_n: 8
    })

    expect(parsed.success).toBe(false)
  })
})
