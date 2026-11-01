import { createHash, randomBytes } from 'node:crypto'
import { getHeader, setResponseHeader, type H3Event } from 'h3'
import { prisma } from '../../utils/prisma'
import { notFound, rateLimited, unauthorized } from '../../utils/api-error'
import {
  consumeFixedWindow,
  retryAfterSeconds,
  type FixedWindowStore
} from '../security/rate-limit.service'

export const agentKeySelect = {
  id: true,
  name: true,
  prefix: true,
  revokedAt: true,
  lastUsedAt: true,
  createdAt: true
} as const
const requestWindows: FixedWindowStore = new Map()

export function hashAgentToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function listAgentKeys() {
  return prisma.agentApiKey.findMany({ select: agentKeySelect, orderBy: { createdAt: 'desc' } })
}

export async function createAgentKey(name: string, createdById: number) {
  const token = `blog_agent_${randomBytes(32).toString('base64url')}`
  const key = await prisma.agentApiKey.create({
    data: { name, createdById, prefix: token.slice(0, 19), tokenHash: hashAgentToken(token) },
    select: agentKeySelect
  })
  return { key, token }
}

export async function revokeAgentKey(id: number) {
  const result = await prisma.agentApiKey.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: new Date() }
  })
  if (
    !result.count &&
    !(await prisma.agentApiKey.findUnique({ where: { id }, select: { id: true } }))
  ) {
    throw notFound('密钥不存在')
  }
  return { id }
}

export async function requireAgentToken(event: H3Event) {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const authorization = getHeader(event, 'authorization') || ''
  const token = /^Bearer (blog_agent_[A-Za-z0-9_-]{43})$/i.exec(authorization)?.[1]
  if (!token) throw unauthorized('请提供有效的 Agent Bearer 密钥')
  const key = await prisma.agentApiKey.findUnique({
    where: { tokenHash: hashAgentToken(token) },
    select: { id: true, revokedAt: true, createdBy: { select: { role: true, status: true } } }
  })
  if (
    !key ||
    key.revokedAt ||
    key.createdBy?.role !== 'ADMIN' ||
    key.createdBy.status !== 'ACTIVE'
  ) {
    throw unauthorized('Agent 密钥无效或已停用')
  }
  // This mirrors the existing per-process request limiter; revoked keys never enter the map.
  for (const [id, state] of requestWindows)
    if (state.resetAt <= Date.now()) requestWindows.delete(id)
  consumeFixedWindow(requestWindows, String(key.id), 60_000, 60, (state) => {
    setResponseHeader(event, 'Retry-After', retryAfterSeconds(state.resetAt))
    throw rateLimited('Agent 请求过于频繁，请稍后重试')
  })
  await prisma.agentApiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
    select: { id: true }
  })
  return { keyId: key.id }
}
