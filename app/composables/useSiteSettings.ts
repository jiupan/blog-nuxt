export type SiteSettings = {
  site_title: string
  site_subtitle: string
  site_logo: string
  site_favicon: string
}

const defaults: SiteSettings = {
  site_title: 'Jiupan Blog',
  site_subtitle: '个人博客',
  site_logo: '',
  site_favicon: ''
}

export function useSiteSettings() {
  const settings = useState<SiteSettings>('site-settings', () => ({ ...defaults }))

  const { data } = useFetch<{ data: Record<string, string> }>('/api/settings')

  watch(data, (val) => {
    if (val?.data) {
      settings.value = {
        site_title: val.data.site_title || defaults.site_title,
        site_subtitle: val.data.site_subtitle || defaults.site_subtitle,
        site_logo: val.data.site_logo || defaults.site_logo,
        site_favicon: val.data.site_favicon || defaults.site_favicon
      }
    }
  }, { immediate: true })

  return settings
}
