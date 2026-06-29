export type SiteSettings = {
  site_title: string
  site_subtitle: string
  sidebar_description: string
  site_logo: string
  site_favicon: string
  seo_noindex: string
  seo_keywords: string
  seo_description: string
}

const defaults: SiteSettings = {
  site_title: 'Jiupan Blog',
  site_subtitle: '个人博客',
  sidebar_description: '个人博客',
  site_logo: '',
  site_favicon: '',
  seo_noindex: 'false',
  seo_keywords: '',
  seo_description: ''
}

export function useSiteSettings() {
  const settings = useState<SiteSettings>('site-settings', () => ({ ...defaults }))

  const { data } = useFetch<{ data: Record<string, string> }>('/api/settings')

  watch(data, (val) => {
    if (val?.data) {
      settings.value = {
        site_title: val.data.site_title || defaults.site_title,
        site_subtitle: val.data.site_subtitle || defaults.site_subtitle,
        sidebar_description: val.data.sidebar_description || defaults.sidebar_description,
        site_logo: val.data.site_logo || defaults.site_logo,
        site_favicon: val.data.site_favicon || defaults.site_favicon,
        seo_noindex: val.data.seo_noindex || defaults.seo_noindex,
        seo_keywords: val.data.seo_keywords || defaults.seo_keywords,
        seo_description: val.data.seo_description || defaults.seo_description
      }
    }
  }, { immediate: true })

  return settings
}
