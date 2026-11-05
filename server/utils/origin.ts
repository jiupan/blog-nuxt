import { getHeader, type H3Event } from 'h3'
import { originNotAllowed } from './api-error'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * 同源写入校验。
 *
 * 仓库没有启用 nuxt-security 的 CSRF 保护（其默认值为 csrf: false），而且不能全局开启：
 * /api/agent/** 是无 Origin 头的服务端 Bearer 调用，全局开启会直接打断文章发布与图片上传。
 * 因此这里是跨站写入的唯一防线，必须由评论写入路径显式调用。
 *
 * 判断顺序：
 * 1. Sec-Fetch-Site: cross-site —— 浏览器明确标记为跨站，直接拒绝。
 * 2. 带 Origin —— 必须与允许的站点 origin 精确匹配。
 * 3. 只有 Referer —— 取其 origin 匹配。
 * 4. 两者都没有 —— 非浏览器客户端（curl、服务间调用），放行，交给鉴权与限流兜底。
 */
export function assertSameOrigin(event: H3Event) {
  if (SAFE_METHODS.has(event.method.toUpperCase())) return

  const fetchSite = getHeader(event, 'sec-fetch-site')?.trim().toLowerCase()
  if (fetchSite === 'cross-site') {
    throw originNotAllowed()
  }

  const allowed = getAllowedOrigins(event)
  if (allowed.length === 0) return

  const origin = getHeader(event, 'origin')?.trim()
  if (origin) {
    if (!allowed.includes(normalizeOrigin(origin))) {
      throw originNotAllowed()
    }
    return
  }

  const referer = getHeader(event, 'referer')?.trim()
  if (referer) {
    const refererOrigin = normalizeOrigin(referer)
    if (!refererOrigin || !allowed.includes(refererOrigin)) {
      throw originNotAllowed()
    }
  }
}

/**
 * 允许的站点 origin 集合。
 * 默认取站点地址，另可用 NUXT_COMMENT_ALLOWED_ORIGINS 追加（逗号分隔），
 * 用于本地联调或临时多域名场景。
 */
export function getAllowedOrigins(event: H3Event): string[] {
  const config = useRuntimeConfig(event)
  const configured = String(config.commentAllowedOrigins || '')
    .split(',')
    .map((value) => normalizeOrigin(value))
    .filter((value) => value.length > 0)
  const siteUrl = normalizeOrigin(String(config.public.siteUrl || ''))

  return [...new Set([siteUrl, ...configured].filter((value) => value.length > 0))]
}

/** 归一化成 scheme://host[:port] 形式。无法解析时返回空串。 */
export function normalizeOrigin(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  try {
    const url = new URL(trimmed)
    if (!['http:', 'https:'].includes(url.protocol)) return ''
    return url.origin.toLowerCase()
  } catch {
    return ''
  }
}
