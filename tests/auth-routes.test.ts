import type { H3Event } from 'h3'
import { afterAll, beforeEach, expect, it, vi } from 'vitest'
import { consumeFixedWindow, createFixedWindowStore, getClientIp } from '../server/services/security/rate-limit.service'

const { user, argon, setSession, readRequest, runtimeConfig } = vi.hoisted(() => ({
  user: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  argon: { verify: vi.fn(), hash: vi.fn(), argon2id: 2 },
  setSession: vi.fn(),
  readRequest: vi.fn(),
  runtimeConfig: vi.fn()
}))
vi.mock('../server/utils/prisma', () => ({ prisma: { user } }))
vi.mock('argon2', () => ({ default: argon }))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('readBody', readRequest)
vi.stubGlobal('setUserSession', setSession)
vi.stubGlobal('useRuntimeConfig', runtimeConfig)
const { default: login } = await import('../server/api/auth/login.post')
const { default: register } = await import('../server/api/auth/register.post')

const account = { id: 1, username: 'Reader', email: 'reader@example.com', role: 'USER', status: 'ACTIVE', passwordHash: 'stored-hash' }

function request(remoteAddress: string, headers: Record<string, string> = {}): H3Event {
  return { context: {}, node: { req: { headers, socket: { remoteAddress } } } } as unknown as H3Event
}

beforeEach(() => {
  vi.resetAllMocks()
  runtimeConfig.mockReturnValue({ commentTrustedProxies: '' })
  readRequest.mockResolvedValue({ username: account.username, email: account.email.toUpperCase(), password: 'test-passphrase' })
  user.findFirst.mockResolvedValue(null)
})
afterAll(() => vi.unstubAllGlobals())

it('uses the socket by default and only uses proxy headers from a trusted peer', () => {
  const event = request('192.0.2.10', { 'x-forwarded-for': '198.51.100.1, 203.0.113.3' })
  expect(getClientIp(event)).toBe('192.0.2.10')
  runtimeConfig.mockReturnValue({ commentTrustedProxies: '192.0.2.0/24' })
  expect(getClientIp(event)).toBe('203.0.113.3')
})

it('expires inactive windows and refuses new keys at capacity without evicting active windows', () => {
  const time = vi.spyOn(Date, 'now').mockReturnValue(1)
  try {
    const store = createFixedWindowStore(2)
    const reject = () => { throw new Error('limited') }
    consumeFixedWindow(store, 'short', 60_000, 1, reject)
    consumeFixedWindow(store, 'long', 120_000, 1, reject)
    expect(() => consumeFixedWindow(store, 'new', 60_000, 1, reject)).toThrow('limited')
    time.mockReturnValue(60_001)
    consumeFixedWindow(store, 'new', 60_000, 1, reject)
    expect(store.entries.has('short')).toBe(false)
    expect(() => consumeFixedWindow(store, 'long', 120_000, 1, reject)).toThrow('limited')
  } finally {
    time.mockRestore()
  }
})

it('verifies missing accounts with Argon2 and reserves the login budget before asynchronous work', async () => {
  argon.verify.mockResolvedValue(false)
  const event = request('203.0.113.10')
  const attempts = await Promise.allSettled(Array.from({ length: 6 }, () => login(event)))
  expect(attempts.map(result => result.status === 'rejected' && result.reason.statusCode)).toEqual([401, 401, 401, 401, 401, 429])
  expect(argon.verify).toHaveBeenCalledTimes(5)
  expect(argon.verify).toHaveBeenCalledWith(expect.stringMatching(/^\$argon2id\$/), 'test-passphrase')
  expect(setSession).not.toHaveBeenCalled()
})

it('rejects disabled accounts and starts a session only after verifying an active account', async () => {
  const event = request('203.0.113.11')
  argon.verify.mockResolvedValue(true)
  user.findFirst.mockResolvedValueOnce({ ...account, status: 'DISABLED' }).mockResolvedValue(account)
  await expect(login(event)).rejects.toMatchObject({ statusCode: 403 })
  expect(setSession).not.toHaveBeenCalled()
  await expect(login(event)).resolves.toMatchObject({ data: { id: account.id, role: 'USER' } })
  expect(argon.verify).toHaveBeenCalledWith(account.passwordHash, 'test-passphrase')
  expect(setSession).toHaveBeenCalledWith(event, { user: { id: 1, username: 'Reader', email: account.email, role: 'USER' } })
  argon.verify.mockResolvedValue(false)
  for (let i = 0; i < 5; i++) await expect(login(event)).rejects.toMatchObject({ statusCode: 401 })
})

it('bounds total login work per IP across account names', async () => {
  const event = request('203.0.113.13')
  argon.verify.mockResolvedValue(false)
  for (let i = 0; i < 30; i++) {
    readRequest.mockResolvedValueOnce({ username: 'Reader' + i, password: 'test-passphrase' })
    await expect(login(event)).rejects.toMatchObject({ statusCode: 401 })
  }
  await expect(login(event)).rejects.toMatchObject({ statusCode: 429 })
  expect(argon.verify).toHaveBeenCalledTimes(30)
})

it('validates registration, creates only a normal user and enforces the IP budget', async () => {
  const event = request('203.0.113.12')
  readRequest.mockResolvedValueOnce({ username: 'x' })
  await expect(register(event)).rejects.toMatchObject({ statusCode: 400 })
  argon.hash.mockResolvedValue('new-hash')
  user.create.mockResolvedValue(account)
  await expect(register(event)).resolves.toMatchObject({ data: { id: account.id, role: 'USER' } })
  expect(user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ email: account.email, role: 'USER', passwordHash: 'new-hash' }) })
  expect(setSession).toHaveBeenCalledOnce()
  user.findFirst.mockResolvedValue(account)
  for (let i = 0; i < 4; i++) await expect(register(event)).rejects.toMatchObject({ statusCode: 409 })
  await expect(register(event)).rejects.toMatchObject({ statusCode: 429 })
  expect(user.create).toHaveBeenCalledOnce()
})
