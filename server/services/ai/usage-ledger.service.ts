import type { Prisma } from '@prisma/client'
import type { H3Event } from 'h3'
import { getHeader } from 'h3'
import { prisma } from '../../utils/prisma'
import { withSerializableRetry } from '../../utils/serializable'
import { getClientIp } from '../security/rate-limit.service'
import { createAiQuotaBlockedError } from './errors'

export const articleChatFeature = 'article-chat'
export type AiIdentity = { userId: number } | { guestKey: string }

function dayWindow(now: Date) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

function usageWhere(identity: AiIdentity, article: boolean, now: Date): Prisma.AiUsageLogWhereInput {
  return {
    ...identity,
    feature: article ? articleChatFeature : { not: articleChatFeature },
    createdAt: { gte: dayWindow(now).start },
    OR: [
      { status: { in: article ? ['SUCCESS', 'FAILED'] : ['SUCCESS'] } },
      // Recover a reservation interrupted by a process restart.
      { status: 'PENDING', createdAt: { gte: new Date(now.getTime() - 15 * 60_000) } }
    ]
  }
}

export async function getAiQuota(identity: AiIdentity, article: boolean, limit: number | null) {
  const now = new Date()
  const used = await prisma.aiUsageLog.count({ where: usageWhere(identity, article, now) })
  return { limit, used, remaining: limit === null ? null : Math.max(0, limit - used), resetsAt: dayWindow(now).end.toISOString() }
}

export async function withUsageLedger<T>(event: H3Event, identity: AiIdentity, feature: string, limit: number | null, work: () => Promise<T>) {
  const data = { ...identity, feature, ip: getClientIp(event), userAgent: getHeader(event, 'user-agent') || null }
  const request = await withSerializableRetry(async tx => {
    const blocked = limit !== null && await tx.aiUsageLog.count({
      where: usageWhere(identity, feature === articleChatFeature, new Date())
    }) >= limit
    return tx.aiUsageLog.create({ data: { ...data, status: blocked ? 'BLOCKED' : 'PENDING' } })
  })
  if (request.status === 'BLOCKED') throw createAiQuotaBlockedError(`今日 AI 额度已用完，每天最多 ${limit} 次`)

  let status: 'SUCCESS' | 'FAILED' = 'FAILED'
  try {
    const result = await work()
    status = 'SUCCESS'
    return result
  } finally {
    await prisma.aiUsageLog.update({ where: { id: request.id }, data: { status } }).catch(() => {
      console.error('Could not finalize AI usage record', request.id)
    })
  }
}
