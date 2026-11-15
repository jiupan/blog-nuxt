import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { resolveAdminRedirect, resolveAuthRedirect } from '../app/utils/auth-redirect'

const db = vi.hoisted(() => ({
  accountEmailToken: { findUnique: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn() },
  accountSession: { deleteMany: vi.fn() },
  user: { updateMany: vi.fn() },
  $transaction: vi.fn()
}))
vi.mock('../server/utils/prisma', () => ({ prisma: db }))

const { applyAccountEmailToken, sendAccountEmail } = await import('../server/services/users/account-email.service')
const token = 'a'.repeat(43)
const digest = createHash('sha256').update(token).digest('hex')
const email = 'example@example.invalid'
const user = { id: 7, email, pendingEmail: null, emailVerifiedAt: new Date(), status: 'ACTIVE', passwordHash: 'old-hash' }

beforeEach(() => {
  vi.resetAllMocks()
  db.$transaction.mockImplementation(work => work(db))
  db.user.updateMany.mockResolvedValue({ count: 1 })
  db.accountEmailToken.deleteMany.mockResolvedValue({ count: 1 })
  db.accountEmailToken.findUnique.mockResolvedValue({
    tokenHash: digest, email, user, purpose: 'RESET', expiresAt: new Date(Date.now() + 60_000)
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('account email links', () => {
  it('creates a time-limited token and sends the original only to the email provider', async () => {
    const fetchMail = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMail)
    vi.stubGlobal('useRuntimeConfig', () => ({
      accountMailApiKey: 'test-key', accountMailFrom: 'accounts@example.invalid', public: { siteUrl: 'https://blog.example.invalid' }
    }))
    await sendAccountEmail({} as never, 7, email, 'VERIFY')
    const record = db.accountEmailToken.upsert.mock.calls[0]![0].create
    const message = JSON.parse(fetchMail.mock.calls[0]![1].body)
    const link = new URL(message.text.trim().split(/\s+/).at(-1))
    const secret = new URLSearchParams(link.hash.slice(1)).get('token')!
    expect(link.pathname).toBe('/account/verify')
    expect(record).toMatchObject({ userId: 7, email, purpose: 'VERIFY', tokenHash: createHash('sha256').update(secret).digest('hex') })
    expect(record).not.toHaveProperty('token')
    expect(record.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('rejects an already-claimed reset link without changing the password', async () => {
    db.accountEmailToken.deleteMany.mockResolvedValue({ count: 0 })
    await expect(applyAccountEmailToken(token, 'RESET', 'new-hash')).rejects.toMatchObject({ statusCode: 400 })
    expect(db.user.updateMany).not.toHaveBeenCalled()
  })

  it('binds recovery to the verified email and revokes sessions and unused links', async () => {
    await applyAccountEmailToken(token, 'RESET', 'new-hash')
    expect(db.accountEmailToken.findUnique).toHaveBeenCalledWith({ where: { tokenHash: digest }, include: { user: true } })
    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { id: 7, status: 'ACTIVE', email, pendingEmail: null, passwordHash: 'old-hash' },
      data: { passwordHash: 'new-hash', pendingEmail: null }
    })
    expect(db.accountSession.deleteMany).toHaveBeenCalledWith({ where: { userId: 7 } })
    expect(db.accountEmailToken.deleteMany).toHaveBeenLastCalledWith({ where: { userId: 7 } })
  })

  it('rejects links with the wrong purpose or an unverified recovery email', async () => {
    await expect(applyAccountEmailToken(token, 'VERIFY')).rejects.toMatchObject({ statusCode: 400 })
    db.accountEmailToken.findUnique.mockResolvedValue({
      tokenHash: digest, email, user: { ...user, emailVerifiedAt: null }, purpose: 'RESET',
      expiresAt: new Date(Date.now() + 60_000)
    })
    await expect(applyAccountEmailToken(token, 'RESET', 'new-hash')).rejects.toMatchObject({ statusCode: 400 })
    expect(db.user.updateMany).not.toHaveBeenCalled()
  })
})

it('preserves internal task and admin destinations without redirecting outside their scope', () => {
  expect(resolveAuthRedirect('/lab?continue=1')).toBe('/lab?continue=1')
  expect(resolveAuthRedirect('/\\elsewhere.invalid')).toBe('/account')
  expect(resolveAuthRedirect('/%2Fel.sewhere')).toBe('/account')
  expect(resolveAdminRedirect('/admin/users?role=ADMIN#list')).toBe('/admin/users?role=ADMIN#list')
  expect(resolveAdminRedirect('/admin/foo/../login')).toBe('/admin')
})
