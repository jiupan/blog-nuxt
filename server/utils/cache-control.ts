import { setHeader, type H3Event } from 'h3'

export type PublicCachePreset =
  | 'public-content'
  | 'public-content-detail'
  | 'public-navigation'
  | 'public-media-index'
  | 'no-store'

const cacheHeaders: Record<PublicCachePreset, string> = {
  'public-content': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300',
  'public-content-detail': 'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
  'public-navigation': 'public, max-age=120, s-maxage=300, stale-while-revalidate=600',
  'public-media-index': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
  'no-store': 'no-store'
}

export function setCacheControl(event: H3Event, preset: PublicCachePreset) {
  setHeader(event, 'Cache-Control', cacheHeaders[preset])
}
