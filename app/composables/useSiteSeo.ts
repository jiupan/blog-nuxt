import {
  absoluteSiteUrl,
  canonicalSiteUrl,
  defaultSeoDescription,
  serializeJsonLd
} from '~/utils/seo'

export function useSiteSeo() {
  const route = useRoute()
  const config = useRuntimeConfig()
  const settings = useSiteSettings()
  const siteUrl = String(config.public.siteUrl)
  const name = computed(() => settings.value.site_title || config.public.siteName)
  const canonical = computed(() => canonicalSiteUrl(route.path, route.query, siteUrl))
  const privatePage = computed(() =>
    /^\/(admin|login|register|resume-print)(\/|$)/.test(route.path)
  )
  const description = computed(() => settings.value.seo_description || defaultSeoDescription)
  useHead(() => ({
    htmlAttrs: { lang: 'zh-CN' },
    meta: [{ name: 'baidu-site-verification', content: 'codeva-BCPQzdpJg5' }],
    link: [
      ...(settings.value.site_favicon ? [{ rel: 'icon', href: settings.value.site_favicon }] : []),
      ...(privatePage.value ? [] : [{ rel: 'canonical', href: canonical.value }])
    ],
    script:
      route.path === '/'
        ? [
            {
              key: 'website-schema',
              type: 'application/ld+json',
              innerHTML: serializeJsonLd({
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: name.value,
                url: absoluteSiteUrl('/', siteUrl),
                inLanguage: 'zh-CN'
              })
            }
          ]
        : []
  }))
  useSeoMeta({
    robots: () =>
      privatePage.value ||
      settings.value.seo_noindex === 'true' ||
      Boolean(route.query.keyword || route.query.category || route.query.year)
        ? 'noindex, follow'
        : 'index, follow, max-image-preview:large',
    ogSiteName: name,
    ogUrl: canonical,
    ogType: 'website',
    ogLocale: 'zh_CN',
    ogTitle: name,
    ogDescription: description,
    ogImage: () => absoluteSiteUrl(settings.value.site_logo || '/images/home-hero-ai.png', siteUrl),
    twitterCard: 'summary_large_image'
  })
}
