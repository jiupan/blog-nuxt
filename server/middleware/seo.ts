import { normalizeSlug } from '../utils/slug'

export default defineEventHandler((event) => {
  const { pathname: path, search } = getRequestURL(event)
  if (/^\/(admin|login|register|resume-print|api)(\/|$)/.test(path)) {
    setResponseHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
  }

  const legacy = path.match(/^\/(categories|tags)\/([^/]*%25[^/]*)\/?$/)
  if (!legacy) return

  // Older sitemaps encoded the percent signs in taxonomy URLs.
  const encodedSlug = legacy[2]!.replace(/%25(?:25)*(?=[\da-f]{2})/gi, '%')
  let slug: string
  try {
    slug = decodeURIComponent(encodedSlug)
  } catch {
    return
  }
  if (slug && slug === normalizeSlug(slug)) {
    return sendRedirect(event, `/${legacy[1]}/${encodeURIComponent(slug)}${search}`, 301)
  }
})
