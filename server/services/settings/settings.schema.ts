import { z } from 'zod'

export const settingsDefaults = {
  site_title: 'Jiupan Blog',
  site_subtitle: '个人博客',
  site_brand: 'DYU',
  sidebar_description: '个人博客',
  site_logo: '',
  site_favicon: '',
  seo_noindex: 'false',
  seo_keywords: '',
  seo_description: '',
  footer_copyright: '©2026 {siteName}',
  footer_bottom_links: '文章|/posts\n归档|/archive\n关于|/about\n后台|/admin',
  footer_actions: '[{"label":"文章","to":"/posts","icon":"i-lucide-library"},{"label":"归档","to":"/archive","icon":"i-lucide-archive"},{"label":"我的","to":"/about","icon":"i-lucide-user-round"},{"label":"后台","to":"/admin","icon":"i-lucide-settings"},{"label":"全部文章","to":"/posts","icon":"i-lucide-newspaper"},{"label":"时间线","to":"/archive","icon":"i-lucide-clock-3"},{"label":"友链","to":"/link","icon":"i-lucide-link"},{"label":"登录","to":"/admin/login","icon":"i-lucide-log-in"}]',
  ai_api_key: '',
  ai_base_url: 'https://api.deepseek.com',
  ai_model: 'deepseek-v4-flash',
  ai_embedding_api_key: '',
  ai_embedding_base_url: 'https://api.openai.com/v1',
  ai_embedding_model: 'text-embedding-3-small',
  ai_embedding_dimensions: '1536',
  ai_rerank_enabled: 'false',
  ai_rerank_api_key: '',
  ai_rerank_base_url: 'https://api.cohere.com/v2',
  ai_rerank_model: 'rerank-v3.5',
  ai_rerank_top_n: '8'
} as const

export type SettingsKey = keyof typeof settingsDefaults
export type SettingsMap = Record<SettingsKey, string>

export const settingKeys = Object.keys(settingsDefaults) as SettingsKey[]

export const publicSettingKeys = [
  'site_title',
  'site_subtitle',
  'site_brand',
  'sidebar_description',
  'site_logo',
  'site_favicon',
  'seo_noindex',
  'seo_keywords',
  'seo_description',
  'footer_copyright',
  'footer_bottom_links',
  'footer_actions'
] as const satisfies readonly SettingsKey[]

const optionalUrl = z.string().url().or(z.literal('')).optional()

export const settingsInputSchema = z.object({
  site_title: z.string().optional(),
  site_subtitle: z.string().optional(),
  site_brand: z.string().optional(),
  sidebar_description: z.string().optional(),
  site_logo: z.string().optional(),
  site_favicon: z.string().optional(),
  seo_noindex: z.enum(['true', 'false']).optional(),
  seo_keywords: z.string().optional(),
  seo_description: z.string().optional(),
  footer_copyright: z.string().optional(),
  footer_bottom_links: z.string().optional(),
  footer_actions: z.string().optional(),
  ai_api_key: z.string().optional(),
  ai_base_url: optionalUrl,
  ai_model: z.string().optional(),
  ai_embedding_api_key: z.string().optional(),
  ai_embedding_base_url: optionalUrl,
  ai_embedding_model: z.string().optional(),
  ai_embedding_dimensions: z.string().optional(),
  ai_rerank_enabled: z.enum(['true', 'false']).optional(),
  ai_rerank_api_key: z.string().optional(),
  ai_rerank_base_url: optionalUrl,
  ai_rerank_model: z.string().optional(),
  ai_rerank_top_n: z.string().optional()
}).strict()

export type SettingsInput = z.infer<typeof settingsInputSchema>
export type PublicSettingsMap = Pick<SettingsMap, typeof publicSettingKeys[number]>
