import type { ApiResult } from '~~/types/api'
import type { SiteSettingsPayload } from '~~/types/dto/settings'

export type SiteSettings = {
  site_title: string
  site_subtitle: string
  site_brand: string
  sidebar_description: string
  site_logo: string
  site_favicon: string
  seo_noindex: string
  seo_keywords: string
  seo_description: string
  footer_copyright: string
  footer_bottom_links: string
  footer_actions: string
}

const defaults: SiteSettings = {
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
  footer_actions: '[{"label":"文章","to":"/posts","icon":"i-lucide-library"},{"label":"归档","to":"/archive","icon":"i-lucide-archive"},{"label":"我的","to":"/about","icon":"i-lucide-user-round"},{"label":"后台","to":"/admin","icon":"i-lucide-settings"},{"label":"全部文章","to":"/posts","icon":"i-lucide-newspaper"},{"label":"时间线","to":"/archive","icon":"i-lucide-clock-3"},{"label":"友链","to":"/link","icon":"i-lucide-link"},{"label":"登录","to":"/admin/login","icon":"i-lucide-log-in"}]'
}

export function useSiteSettings() {
  const settings = useState<SiteSettings>('site-settings', () => ({ ...defaults }))
  const loaded = useState<boolean>('site-settings-loaded', () => false)

  const { data, error } = useFetch<ApiResult<SiteSettingsPayload>>('/api/settings')

  watch([data, error], ([val, err]) => {
    if (val?.data) {
      settings.value = {
        site_title: val.data.site_title || defaults.site_title,
        site_subtitle: val.data.site_subtitle || defaults.site_subtitle,
        site_brand: val.data.site_brand || defaults.site_brand,
        sidebar_description: val.data.sidebar_description || defaults.sidebar_description,
        site_logo: val.data.site_logo || defaults.site_logo,
        site_favicon: val.data.site_favicon || defaults.site_favicon,
        seo_noindex: val.data.seo_noindex || defaults.seo_noindex,
        seo_keywords: val.data.seo_keywords || defaults.seo_keywords,
        seo_description: val.data.seo_description || defaults.seo_description,
        footer_copyright: val.data.footer_copyright || defaults.footer_copyright,
        footer_bottom_links: val.data.footer_bottom_links || defaults.footer_bottom_links,
        footer_actions: val.data.footer_actions || defaults.footer_actions
      }
    }
    if (val?.data || err) {
      loaded.value = true
    }
  }, { immediate: true })

  return settings
}

export function useSiteSettingsLoaded() {
  return useState<boolean>('site-settings-loaded', () => false)
}
