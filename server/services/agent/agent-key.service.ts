import { randomBytes } from 'node:crypto'
import { getHeader, setResponseHeader, type H3Event } from 'h3'
import { prisma } from '../../utils/prisma'
import { conflict, notFound, rateLimited, unauthorized } from '../../utils/api-error'
import {
  decryptAgentToken,
  encryptAgentToken,
  hashAgentToken,
  resolveAgentEncryptionSecret
} from './agent-key-crypto'
import {
  consumeFixedWindow,
  retryAfterSeconds,
  createFixedWindowStore
} from '../security/rate-limit.service'
export { hashAgentToken } from './agent-key-crypto'

export const agentKeySelect = {
  id: true,
  name: true,
  prefix: true,
  revokedAt: true,
  lastUsedAt: true,
  createdAt: true
} as const
const requestWindows = createFixedWindowStore()

export async function listAgentKeys() {
  const keys = await prisma.agentApiKey.findMany({
    select: { ...agentKeySelect, encryptedToken: true },
    orderBy: { createdAt: 'desc' }
  })
  return keys.map(({ encryptedToken, ...key }) => ({
    ...key,
    canCopy: Boolean(encryptedToken) && !key.revokedAt
  }))
}

export async function createAgentKey(name: string, createdById: number, encryptionSecret: string) {
  const token = `blog_agent_${randomBytes(32).toString('base64url')}`
  const key = await prisma.agentApiKey.create({
    data: {
      name,
      createdById,
      prefix: token.slice(0, 19),
      tokenHash: hashAgentToken(token),
      encryptedToken: encryptAgentToken(token, encryptionSecret)
    },
    select: agentKeySelect
  })
  return { key: { ...key, canCopy: true }, token }
}

export async function copyAgentKey(id: number, encryptionSecret: string, operatorId: number) {
  const key = await prisma.agentApiKey.findUnique({
    where: { id },
    select: { tokenHash: true, encryptedToken: true, revokedAt: true }
  })
  if (!key) throw notFound('密钥不存在')
  if (key.revokedAt) throw conflict('密钥已停用，请创建新密钥')
  if (!key.encryptedToken)
    throw conflict('旧版密钥仅保存了哈希，无法恢复原文；可继续使用已有密钥，或创建新密钥')
  const token = decryptAgentToken(key.encryptedToken, key.tokenHash, encryptionSecret)
  await prisma.adminAuditLog.create({
    data: { operatorId, action: 'AGENT_KEY_COPIED', after: { keyId: id } }
  })
  return { token }
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
    select: {
      id: true,
      revokedAt: true,
      encryptedToken: true,
      createdBy: { select: { role: true, status: true } }
    }
  })
  if (
    !key ||
    key.revokedAt ||
    key.createdBy?.role !== 'ADMIN' ||
    key.createdBy.status !== 'ACTIVE'
  ) {
    throw unauthorized('Agent 密钥无效或已停用')
  }
  consumeFixedWindow(requestWindows, String(key.id), 60_000, 60, (state) => {
    setResponseHeader(event, 'Retry-After', retryAfterSeconds(state.resetAt))
    throw rateLimited('Agent 请求过于频繁，请稍后重试')
  })
  // A valid client request can upgrade legacy hash-only keys without changing the token.
  const secret = resolveAgentEncryptionSecret('')
  const encryptedToken =
    !key.encryptedToken && Buffer.byteLength(secret, 'utf8') >= 32
      ? encryptAgentToken(token, secret)
      : undefined
  await prisma.agentApiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date(), ...(encryptedToken ? { encryptedToken } : {}) },
    select: { id: true }
  })
  return { keyId: key.id }
}
