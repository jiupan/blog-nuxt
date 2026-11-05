import { createHmac } from 'node:crypto'
import { BlockList, isIP } from 'node:net'
import { getHeader, getRequestIP, type H3Event } from 'h3'

/**
 * 可信客户端 IP。
 *
 * 先校验 socket 对端是否在可信代理列表内，再读取代理覆盖的 X-Real-IP。
 * XFF 从右向左剥离可信代理，客户端自行前置的地址不会成为限流键。
 */
export function getTrustedClientIp(
  event: H3Event,
  trustedProxies = String(useRuntimeConfig(event).commentTrustedProxies || '')
): string | null {
  const peer = normalizeIp(getRequestIP(event, { xForwardedFor: false }) || '')
  const trusted = new BlockList()
  for (const entry of trustedProxies.split(',').map(value => value.trim()).filter(Boolean)) {
    const [address = '', prefix] = entry.split('/')
    const normalized = normalizeIp(address)
    const version = isIP(normalized)
    if (!version) continue
    const family = version === 4 ? 'ipv4' : 'ipv6'
    if (prefix === undefined) trusted.addAddress(normalized, family)
    else if (/^\d+$/.test(prefix) && Number(prefix) <= (version === 4 ? 32 : 128)) {
      trusted.addSubnet(normalized, Number(prefix), family)
    }
  }
  const isTrusted = (ip: string) => Boolean(isIP(ip)) && trusted.check(ip, isIP(ip) === 4 ? 'ipv4' : 'ipv6')
  if (!peer || !isTrusted(peer)) return peer || null

  const realIp = getHeader(event, 'x-real-ip')?.trim()
  if (realIp && isIP(normalizeIp(realIp))) {
    return normalizeIp(realIp)
  }

  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) {
    const parts = forwarded
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
    let current = peer
    for (const part of parts.reverse()) {
      if (!isTrusted(current)) break
      const address = normalizeIp(part)
      if (!isIP(address)) return peer
      current = address
    }
    return current
  }

  return peer
}

/**
 * IP 的 HMAC 摘要，用于限流桶的 keyHash。
 * 原始 IP 不入库、不入日志；相同 IP 在同一密钥下得到稳定摘要。
 */
export function hashClientIp(ip: string, secret: string): string {
  return hashRateKey(secret, 'ip', ip)
}

/**
 * 限流桶 key 的 HMAC 摘要。
 *
 * 账号 id、访客凭证摘要、IP 都不直接落库，统一用服务端密钥加域分隔符做 HMAC。
 * 换密钥等于换一批桶，历史计数自然失效。
 */
export function hashRateKey(secret: string, scope: string, value: string): string {
  return createHmac('sha256', secret).update(`comment-${scope}:${value}`).digest('hex')
}

function normalizeIp(value: string): string {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return ''

  // IPv6 代理可能写成 [::1] 或 ::1
  const unwrapped = trimmed.startsWith('[') && trimmed.endsWith(']')
    ? trimmed.slice(1, -1)
    : trimmed

  if (unwrapped === '::1' || unwrapped === '::ffff:127.0.0.1') return '127.0.0.1'
  if (unwrapped.startsWith('::ffff:') && isIP(unwrapped.slice(7)) === 4) return unwrapped.slice(7)
  return unwrapped
}
