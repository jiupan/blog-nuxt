export type SiteSettingsKey =
  | 'site_title'
  | 'site_subtitle'
  | 'site_brand'
  | 'sidebar_description'
  | 'sidebar_author_name'
  | 'sidebar_author_subtitle'
  | 'sidebar_author_description'
  | 'sidebar_author_avatar'
  | 'sidebar_avatar_webp_max_edge'
  | 'sidebar_avatar_webp_quality'
  | 'sidebar_author_signature'
  | 'sidebar_modules'
  | 'site_logo'
  | 'site_favicon'
  | 'hero_meme_group'
  | 'home_post_card_style'
  | 'seo_noindex'
  | 'seo_keywords'
  | 'seo_description'
  | 'footer_copyright'
  | 'footer_icp'
  | 'footer_bottom_links'
  | 'footer_actions'
  | 'ai_api_key'
  | 'ai_base_url'
  | 'ai_model'
  | 'ai_embedding_api_key'
  | 'ai_embedding_base_url'
  | 'ai_embedding_model'
  | 'ai_embedding_dimensions'
  | 'ai_rerank_enabled'
  | 'ai_rerank_api_key'
  | 'ai_rerank_base_url'
  | 'ai_rerank_model'
  | 'ai_rerank_top_n'

export type PublicSiteSettingsKey =
  | 'site_title'
  | 'site_subtitle'
  | 'site_brand'
  | 'sidebar_description'
  | 'sidebar_author_name'
  | 'sidebar_author_subtitle'
  | 'sidebar_author_description'
  | 'sidebar_author_avatar'
  | 'sidebar_author_signature'
  | 'sidebar_modules'
  | 'site_logo'
  | 'site_favicon'
  | 'hero_meme_group'
  | 'home_post_card_style'
  | 'seo_noindex'
  | 'seo_keywords'
  | 'seo_description'
  | 'footer_copyright'
  | 'footer_icp'
  | 'footer_bottom_links'
  | 'footer_actions'

export type SiteSettingsPayload = Record<PublicSiteSettingsKey, string>

export const animatedAvatarCompression = {
  maxEdge: { min: 128, max: 512, default: 320 },
  quality: { min: 1, max: 100, default: 70 }
} as const

export const aiSecretKeys = ['ai_api_key', 'ai_embedding_api_key', 'ai_rerank_api_key'] as const
export type AiSecretKey = typeof aiSecretKeys[number]
export type AiSecretStatus = { stored: boolean, environment: boolean }
export type AiSecretStatuses = Record<AiSecretKey, AiSecretStatus>

export type AdminSettingsPayload = Record<Exclude<SiteSettingsKey, AiSecretKey>, string> & {
  aiSecretStatus: AiSecretStatuses
}
