export type LinkCheckStatus = 'OK' | 'REDIRECT' | 'BROKEN' | 'TIMEOUT' | 'BLOCKED' | 'UNKNOWN'

export type ExtractedExternalLink = {
  url: string
  text?: string
  line: number
}

export type LinkCheckItem = ExtractedExternalLink & {
  status: LinkCheckStatus
  statusCode?: number
  finalUrl?: string
  error?: string
  checkedAt: string
}

export type LinkCheckSummary = {
  total: number
  ok: number
  redirect: number
  broken: number
  timeout: number
  blocked: number
  unknown: number
}

export type LinkCheckResult = {
  summary: LinkCheckSummary
  items: LinkCheckItem[]
}

const maxLinksPerCheck = 30
const requestTimeoutMs = 8000

export async function checkExternalLinks(content: string, siteUrl?: string): Promise<LinkCheckResult> {
  const links = extractExternalLinks(content, siteUrl).slice(0, maxLinksPerCheck)
  const items = await mapWithConcurrency(links, 4, checkLink)

  return {
    summary: summarize(items),
    items
  }
}

export function extractExternalLinks(content: string, siteUrl?: string): ExtractedExternalLink[] {
  const siteHost = getHost(siteUrl)
  const seen = new Set<string>()
  const links: ExtractedExternalLink[] = []

  content.split(/\r?\n/).forEach((lineText, index) => {
    const line = index + 1
    const candidates = [
      ...extractMarkdownLinks(lineText, line),
      ...extractHtmlLinks(lineText, line),
      ...extractPlainUrls(lineText, line)
    ]

    candidates.forEach((candidate) => {
      const normalized = normalizeUrl(candidate.url)
      if (!normalized || seen.has(normalized) || !isExternalHttpUrl(normalized, siteHost)) {
        return
      }

      seen.add(normalized)
      links.push({
        ...candidate,
        url: normalized
      })
    })
  })

  return links
}

async function checkLink(link: ExtractedExternalLink): Promise<LinkCheckItem> {
  const checkedAt = new Date().toISOString()

  if (isBlockedUrl(link.url)) {
    return {
      ...link,
      status: 'BLOCKED',
      error: '已跳过本地或内网地址',
      checkedAt
    }
  }

  try {
    let response = await requestLink(link.url, 'HEAD').catch(async (error) => {
      if (error?.name === 'AbortError') {
        throw error
      }

      return requestLink(link.url, 'GET')
    })

    if ([403, 405].includes(response.status)) {
      response = await requestLink(link.url, 'GET')
    }

    return {
      ...link,
      status: normalizeResponseStatus(response),
      statusCode: response.status,
      finalUrl: response.redirected ? response.url : undefined,
      checkedAt
    }
  } catch (error: any) {
    return {
      ...link,
      status: error?.name === 'AbortError' ? 'TIMEOUT' : 'UNKNOWN',
      error: error?.name === 'AbortError' ? '请求超时' : (error?.message || '检查失败'),
      checkedAt
    }
  }
}

async function requestLink(url: string, method: 'HEAD' | 'GET') {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs)

  try {
    return await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BlogLinkChecker/1.0)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...(method === 'GET' ? { Range: 'bytes=0-2048' } : {})
      }
    })
  } finally {
    clearTimeout(timer)
  }
}

function normalizeResponseStatus(response: Response): LinkCheckStatus {
  if (response.redirected) {
    return response.ok ? 'REDIRECT' : 'BROKEN'
  }

  if (response.ok) {
    return 'OK'
  }

  if (response.status >= 400) {
    return 'BROKEN'
  }

  return 'UNKNOWN'
}

function summarize(items: LinkCheckItem[]): LinkCheckSummary {
  return {
    total: items.length,
    ok: items.filter((item) => item.status === 'OK').length,
    redirect: items.filter((item) => item.status === 'REDIRECT').length,
    broken: items.filter((item) => item.status === 'BROKEN').length,
    timeout: items.filter((item) => item.status === 'TIMEOUT').length,
    blocked: items.filter((item) => item.status === 'BLOCKED').length,
    unknown: items.filter((item) => item.status === 'UNKNOWN').length
  }
}

function extractMarkdownLinks(lineText: string, line: number): ExtractedExternalLink[] {
  return [...lineText.matchAll(/\[([^\]]+)]\((https?:\/\/[^)\s]+)(?:\s+"[^"]*")?\)/gi)]
    .map((match) => ({
      text: match[1]?.trim(),
      url: match[2] || '',
      line
    }))
}

function extractHtmlLinks(lineText: string, line: number): ExtractedExternalLink[] {
  return [...lineText.matchAll(/<a\b[^>]*\bhref=["'](https?:\/\/[^"']+)["'][^>]*>(.*?)<\/a>/gi)]
    .map((match) => ({
      text: stripTags(match[2] || '').trim(),
      url: match[1] || '',
      line
    }))
}

function extractPlainUrls(lineText: string, line: number): ExtractedExternalLink[] {
  return [...lineText.matchAll(/(?<!["'(=])(https?:\/\/[^\s<>"')]+)/gi)]
    .map((match) => ({
      url: match[1] || '',
      line
    }))
}

function normalizeUrl(value: string) {
  const trimmed = value.trim().replace(/[),.;!?，。；！？]+$/g, '')

  try {
    const url = new URL(trimmed)
    url.hash = ''
    return url.toString()
  } catch {
    return ''
  }
}

function isExternalHttpUrl(url: string, siteHost?: string) {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol) && parsed.host !== siteHost
  } catch {
    return false
  }
}

function isBlockedUrl(url: string) {
  const hostname = getHostname(url)
  if (!hostname) return true

  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '0.0.0.0'
    || hostname === '::1'
    || hostname === '[::1]'
    || hostname.endsWith('.local')
    || hostname.startsWith('169.254.')
    || /^10\./.test(hostname)
    || /^192\.168\./.test(hostname)
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    || hostname.startsWith('fc')
    || hostname.startsWith('fd')
    || hostname.startsWith('fe80:')
}

function getHost(value?: string) {
  if (!value) return undefined

  try {
    return new URL(value).host
  } catch {
    return undefined
  }
}

function getHostname(value?: string) {
  if (!value) return undefined

  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return undefined
  }
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, '')
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  let index = 0

  async function worker() {
    while (index < items.length) {
      const currentIndex = index
      const item = items[currentIndex]
      index += 1

      if (item !== undefined) {
        results[currentIndex] = await mapper(item)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return results
}
