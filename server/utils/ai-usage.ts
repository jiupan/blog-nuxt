import { getHeader, type H3Event } from 'h3'
import { prisma } from '~~/server/utils/prisma'
import { requireUser, type SessionUser } from '~~/server/utils/auth'
import { unauthorized } from '~~/server/utils/api-error'
import { createAiQuotaBlockedError, createAiRateLimitedError } from '~~/server/services/ai/errors'
import { aiUsagePolicy } from '~~/server/services/security/security-policy'
import { consumeFixedWindow, getClientIp, type FixedWindowStore } from '~~/server/services/security/rate-limit.service'
import { getKnowledgeRuntimeSettings } from '~~/server/services/settings/settings.service'

const userWindows: FixedWindowStore = new Map()
const ipWindows: FixedWindowStore = new Map()

export async function requireLabUser(event: H3Event) {
  const user = await requireUser(event) as SessionUser
  return user
}

export async function withAiUsage<T>(event: H3Event, feature: string, handler: () => Promise<T>) {
  const user = await requireLabUser(event)
  const ip = getClientIp(event)
  const userAgent = getHeader(event, 'user-agent') || null

  await assertAiQuota(event, user, feature, ip, userAgent)

  try {
    const result = await handler()
    await recordAiUsage(user.id!, feature, 'SUCCESS', ip, userAgent)
    return result
  } catch (error) {
    await recordAiUsage(user.id!, feature, 'FAILED', ip, userAgent)
    throw error
  }
}

async function assertAiQuota(event: H3Event, user: SessionUser, feature: string, ip: string, userAgent: string | null) {
  if (!user.id) {
    throw unauthorized('请先登录后再使用 AI 功能')
  }

  consumeFixedWindow(userWindows, `user:${user.id}`, aiUsagePolicy.userWindowMs, aiUsagePolicy.userWindowLimit, () => {
    throw createAiRateLimitedError('操作太频繁，请稍后再试')
  })
  const knowledgeSettings = feature === 'ask-blog' ? await getKnowledgeRuntimeSettings() : null
  consumeFixedWindow(ipWindows, `ip:${ip}`, aiUsagePolicy.ipWindowMs, knowledgeSettings?.ipHourlyLimit || aiUsagePolicy.ipWindowLimit, () => {
    throw createAiRateLimitedError('当前网络请求过于频繁，请稍后再试')
  })

  if (user.role === 'ADMIN') {
    return
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const used = await prisma.aiUsageLog.count({
    where: {
      userId: user.id,
      status: 'SUCCESS',
      createdAt: { gte: todayStart }
    }
  })

  const dailyLimit = knowledgeSettings?.dailyUserLimit || aiUsagePolicy.dailyUserLimit
  if (used >= dailyLimit) {
    await recordAiUsage(user.id, feature, 'BLOCKED', ip, userAgent)
    throw createAiQuotaBlockedError(`今日 AI 额度已用完，每天可使用 ${dailyLimit} 次`)
  }
}

async function recordAiUsage(
  userId: number,
  feature: string,
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED',
  ip: string,
  userAgent: string | null
) {
  await prisma.aiUsageLog.create({
    data: {
      userId,
      feature,
      status,
      ip,
      userAgent
    }
  }).catch(() => null)
}
