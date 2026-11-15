import type { H3Event } from 'h3'
import { requireUser } from '~~/server/utils/auth'
import { createAiRateLimitedError } from '~~/server/services/ai/errors'
import { withUsageLedger } from '~~/server/services/ai/usage-ledger.service'
import { aiUsagePolicy } from '~~/server/services/security/security-policy'
import { consumeFixedWindow, createFixedWindowStore, getClientIp } from '~~/server/services/security/rate-limit.service'
import { getKnowledgeRuntimeSettings } from '~~/server/services/settings/settings.service'

const userWindows = createFixedWindowStore()
const ipWindows = createFixedWindowStore()

export const requireLabUser = requireUser

export async function withAiUsage<T>(event: H3Event, feature: string, handler: () => Promise<T>) {
  const user = await requireLabUser(event)
  const settings = await getKnowledgeRuntimeSettings()
  consumeFixedWindow(userWindows, `user:${user.id}`, aiUsagePolicy.userWindowMs, aiUsagePolicy.userWindowLimit, () => {
    throw createAiRateLimitedError('操作太频繁，请稍后再试')
  })
  consumeFixedWindow(ipWindows, `ip:${getClientIp(event)}`, aiUsagePolicy.ipWindowMs, settings.ipHourlyLimit, () => {
    throw createAiRateLimitedError('当前网络请求过于频繁，请稍后再试')
  })
  return withUsageLedger(event, { userId: user.id }, feature, user.role === 'ADMIN' ? null : settings.dailyUserLimit, handler)
}
