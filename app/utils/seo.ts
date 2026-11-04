export const defaultSeoDescription =
  '记录 AI 编程工具、智能体与本地模型的技术探索，分享 Nuxt 博客开发、项目实践和使用经验。'

export function seoPage(value: unknown): number {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && /^[1-9]\d*$/.test(raw) && Number.isSafeInteger(Number(raw))
    ? Number(raw)
    : 1
}

export function absoluteSiteUrl(path: string, siteUrl: string): string {
  const url = new URL(path, `${siteUrl.replace(/\/$/, '')}/`)
  return ['http:', 'https:'].includes(url.protocol) ? url.href : new URL('/', siteUrl).href
}

export function canonicalSiteUrl(
  path: string,
  query: Record<string, unknown>,
  siteUrl: string
): string {
  const url = new URL(path, siteUrl)
  url.search = ''
  url.hash = ''
  const listing =
    /^\/(archive)?\/?$/.test(url.pathname) ||
    /^\/(categories|tags)\/[^/]+\/?$/.test(url.pathname)
  const page = seoPage(query.page)
  if (listing && page > 1) url.searchParams.set('page', String(page))
  const keys =
    /^\/archive\/?$/.test(url.pathname)
      ? ['category', 'year', 'keyword']
      : url.pathname === '/'
        ? ['category', 'year']
        : []
  for (const key of keys) {
    const value = query[key]
    if (typeof value === 'string' && value.trim()) url.searchParams.set(key, value.trim())
  }
  return url.href
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
