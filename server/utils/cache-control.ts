import { setHeader, type H3Event } from 'h3'

export type PublicCachePreset =
  | 'public-content'
  | 'public-content-detail'
  | 'public-navigation'
  | 'public-media-index'
  | 'private-no-store'
  | 'no-store'

const cacheHeaders: Record<PublicCachePreset, string> = {
  'public-content': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300',
  'public-content-detail': 'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
  'public-navigation': 'public, max-age=120, s-maxage=300, stale-while-revalidate=600',
  'public-media-index': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
  // 评论响应里的 canDelete 依赖访问者身份，共享缓存会把一个人的可见性发给所有人。
  'private-no-store': 'private, no-store',
  'no-store': 'no-store'
}

export function setCacheControl(event: H3Event, preset: PublicCachePreset) {
  setHeader(event, 'Cache-Control', cacheHeaders[preset])
}
