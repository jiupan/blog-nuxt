import { createError, getHeader, getRequestIP, type H3Event } from 'h3'
import { prisma } from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/auth'

const DAILY_USER_LIMIT = 20
const USER_WINDOW_MS = 60 * 1000
const USER_WINDOW_LIMIT = 5
const IP_WINDOW_MS = 60 * 60 * 1000
const IP_WINDOW_LIMIT = 60

const userWindows = new Map<string, { count: number, resetAt: number }>()
const ipWindows = new Map<string, { count: number, resetAt: number }>()

type SessionUser = {
  id?: number
  username?: string
  role?: string
}

export async function requireLabUser(event: H3Event) {
  const user = await requireUser(event) as SessionUser
  return user
}

export async function withAiUsage<T>(event: H3Event, feature: string, handler: () => Promise<T>) {
  const user = await requireLabUser(event)
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
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
    throw createError({
      statusCode: 401,
      statusMessage: '请先登录后再使用 AI 功能'
    })
  }

  assertWindow(`user:${user.id}`, userWindows, USER_WINDOW_MS, USER_WINDOW_LIMIT, '操作太频繁，请稍后再试')
  assertWindow(`ip:${ip}`, ipWindows, IP_WINDOW_MS, IP_WINDOW_LIMIT, '当前网络请求过于频繁，请稍后再试')

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

  if (used >= DAILY_USER_LIMIT) {
    await recordAiUsage(user.id, feature, 'BLOCKED', ip, userAgent)
    throw createError({
      statusCode: 429,
      statusMessage: `今日 AI 额度已用完，每天可使用 ${DAILY_USER_LIMIT} 次`
    })
  }
}

function assertWindow(
  key: string,
  store: Map<string, { count: number, resetAt: number }>,
  windowMs: number,
  limit: number,
  message: string
) {
  const now = Date.now()
  const current = store.get(key)

  if (!current || current.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs
    })
    return
  }

  if (current.count >= limit) {
    throw createError({
      statusCode: 429,
      statusMessage: message
    })
  }

  current.count += 1
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
