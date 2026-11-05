import { readFileSync } from 'node:fs'
import type { H3Event } from 'h3'
import { describe, expect, it } from 'vitest'
import { resolveMapping } from '../scripts/lib/comment-mapping'
import { normalizeRecord } from '../scripts/lib/comment-source'
import { buildPlan } from '../scripts/lib/comment-plan'
import { getTrustedClientIp } from '../server/utils/client-ip'

describe('native comment import', () => {
  it('preserves Twikoo nested reply targets and nullable historical likes', async () => {
    const mapping = resolveMapping(null)
    const raw = JSON.parse(readFileSync(new URL('../fixtures/twikoo-comments.sample.json', import.meta.url), 'utf8'))
    const plan = await buildPlan({
      records: raw.map((record: Record<string, unknown>) => normalizeRecord(record, mapping).record),
      mapping,
      lookup: { find: async slug => ({ id: 1, slug, title: 'Test' }) },
      allowAnyHost: true
    })
    const items = plan.posts.flatMap(post => post.items)
    expect(items.find(item => item.sourceId === 'reply-2')).toMatchObject({
      threadRootSourceId: 'root-1', replyToSourceId: 'reply-1', likeCount: null
    })
    expect(items.find(item => item.sourceId === 'root-1')).toMatchObject({ likeCount: 3 })
  })
})

function event(peer: string, headers: Record<string, string> = {}) {
  return { context: {}, node: { req: { headers, socket: { remoteAddress: peer } } } } as unknown as H3Event
}

describe('comment client IP trust', () => {
  it('ignores client-supplied forwarding headers on direct requests', () => {
    const request = event('203.0.113.1', { 'x-real-ip': '198.51.100.1', 'x-forwarded-for': '198.51.100.2' })
    expect(getTrustedClientIp(request, '')).toBe('203.0.113.1')
    expect(getTrustedClientIp(request, '127.0.0.1,172.18.0.1')).toBe('203.0.113.1')
  })

  it('accepts a valid overwritten IP only from an explicitly trusted peer', () => {
    expect(getTrustedClientIp(event('::ffff:172.18.0.1', { 'x-real-ip': '203.0.113.9' }), '172.18.0.1')).toBe('203.0.113.9')
    expect(getTrustedClientIp(event('172.18.0.1', { 'x-real-ip': 'arbitrary-limit-key' }), '172.18.0.1')).toBe('172.18.0.1')
  })

  it('stops at the first untrusted XFF hop and ignores spoofed prefixes', () => {
    const headers = { 'x-forwarded-for': '198.51.100.123,203.0.113.9,10.0.0.2' }
    expect(getTrustedClientIp(event('10.0.0.1', headers), '10.0.0.0/24')).toBe('203.0.113.9')
    expect(getTrustedClientIp(event('10.0.0.1', { 'x-forwarded-for': 'bad-ip' }), '10.0.0.0/24')).toBe('10.0.0.1')
  })
})
