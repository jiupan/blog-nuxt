import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'

const db = vi.hoisted(() => ({
  aiUsageLog: { count: vi.fn(), create: vi.fn(), update: vi.fn() },
  $transaction: vi.fn()
}))
vi.mock('../server/utils/prisma', () => ({ prisma: db }))
const { articleChatFeature, getAiQuota, withUsageLedger } = await import('../server/services/ai/usage-ledger.service')
const event = { context: {}, node: { req: { headers: {}, socket: { remoteAddress: '192.0.2.10' } } } } as unknown as H3Event

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('useRuntimeConfig', () => ({ commentTrustedProxies: '' }))
  db.$transaction.mockImplementation(work => work(db))
  db.aiUsageLog.create.mockImplementation(({ data }) => ({ id: 5, ...data }))
  db.aiUsageLog.update.mockResolvedValue({})
})
afterEach(() => vi.unstubAllGlobals())

it('records article attempts against a ledger independent of conversation history', async () => {
  db.aiUsageLog.count.mockResolvedValue(2)
  const work = vi.fn().mockRejectedValue(new Error('test provider failure'))
  await expect(withUsageLedger(event, { userId: 7 }, articleChatFeature, 3, work)).rejects.toThrow('test provider failure')
  expect(db.aiUsageLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 7, feature: articleChatFeature, status: 'PENDING' }) })
  expect(db.aiUsageLog.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { status: 'FAILED' } })
  await expect(getAiQuota({ userId: 7 }, true, 3)).resolves.toMatchObject({ remaining: 1 })
  expect(db.aiUsageLog.count).toHaveBeenLastCalledWith({ where: expect.objectContaining({
    userId: 7, feature: articleChatFeature, OR: expect.arrayContaining([{ status: { in: ['SUCCESS', 'FAILED'] } }])
  }) })
})

it('records a blocked request without running the provider', async () => {
  db.aiUsageLog.count.mockResolvedValue(3)
  const work = vi.fn()
  await expect(withUsageLedger(event, { guestKey: 'guest-hash' }, articleChatFeature, 3, work)).rejects.toMatchObject({ statusCode: 429 })
  expect(db.aiUsageLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ guestKey: 'guest-hash', status: 'BLOCKED' }) })
  expect(work).not.toHaveBeenCalled()
})
