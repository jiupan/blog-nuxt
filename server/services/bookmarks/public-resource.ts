import { lookup } from 'node:dns'
import { get as getHttp } from 'node:http'
import type { IncomingMessage } from 'node:http'
import { get as getHttps } from 'node:https'
import { isIP } from 'node:net'
import type { LookupFunction } from 'node:net'
import ipaddr from 'ipaddr.js'
import { badRequest } from '../../utils/api-error'

export function isPublicAddress(address: string) {
  if (!isIP(address) || address.includes('%')) return false
  const ip = ipaddr.parse(address)
  if (ip instanceof ipaddr.IPv4) return ip.range() === 'unicast'
  return ip.match(ipaddr.IPv6.parse('2000::'), 3) && ip.range() === 'unicast'
    && !ip.match(ipaddr.IPv6.parse('2001::'), 23) && !ip.match(ipaddr.IPv6.parse('3fff::'), 20)
}

export function publicResourceUrl(input: string, base?: URL) {
  const url = new URL(input, base)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port || url.href.length > 2048) {
    throw badRequest('只支持使用标准端口的公开 HTTP 或 HTTPS 网址')
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  if (isIP(hostname) && !isPublicAddress(hostname)) throw badRequest('不能访问本地或内网地址')
  url.hash = ''
  return url
}

// Supply the verified address to the socket itself so there is no second DNS lookup.
const lookupPublicAddress: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { all: true }, (error, addresses) => {
    const first = addresses?.[0]
    if (error) return callback(error, '', 0)
    if (!first || addresses.some(({ address }) => !isPublicAddress(address))) {
      return callback(badRequest('不能访问本地或内网地址'), '', 0)
    }
    return options.all ? callback(null, addresses) : callback(null, first.address, first.family)
  })
}

export async function readPublicResource(initial: URL, kind: 'html' | 'image', deadline: AbortSignal) {
  let url = publicResourceUrl(initial.href)
  const cap = kind === 'html' ? 512 * 1024 : 1024 * 1024
  for (let hop = 0; hop < 4; hop++) {
    const signal = AbortSignal.any([deadline, AbortSignal.timeout(4500)])
    const response = await new Promise<IncomingMessage>((resolve, reject) => {
      const get = url.protocol === 'https:' ? getHttps : getHttp
      get(url, {
        agent: false,
        lookup: lookupPublicAddress,
        signal,
        headers: {
          Accept: kind === 'html' ? 'text/html, application/xhtml+xml' : 'image/*, application/octet-stream;q=0.8',
          'Accept-Encoding': 'identity',
          'User-Agent': 'JiupanBlog/1.0 (bookmark metadata)'
        }
      }, resolve).once('error', reject)
    })
    try {
      const status = response.statusCode ?? 0
      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
        url = publicResourceUrl(response.headers.location, url)
        continue
      }
      const type = response.headers['content-type'] ?? ''
      const encoding = response.headers['content-encoding']?.toLowerCase()
      if (status < 200 || status >= 300 || (encoding && encoding !== 'identity')) throw badRequest('网站没有返回可读取的内容')
      if (kind === 'html' && !/^(text\/html|application\/xhtml\+xml)(?:\s*;|$)/i.test(type)) throw badRequest('该网址没有返回网页')
      if (kind === 'image' && (/^(text\/html|application\/xhtml\+xml)(?:\s*;|$)/i.test(type) || Number(response.headers['content-length']) > cap)) throw badRequest('图标格式不支持或文件过大')
      const chunks: Buffer[] = []
      let size = 0
      for await (const chunk of response as AsyncIterable<Buffer>) {
        if (size + chunk.length > cap) {
          if (kind === 'image') throw badRequest('图标文件过大')
          chunks.push(chunk.subarray(0, cap - size))
          break
        }
        chunks.push(chunk)
        size += chunk.length
      }
      return { url, type, bytes: Buffer.concat(chunks) }
    } finally {
      response.destroy()
    }
  }
  throw badRequest('网站跳转次数过多')
}
