import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getUserSessionMock, prismaMock } = vi.hoisted(() => ({
  getUserSessionMock: vi.fn(),
  prismaMock: { accountSession: { findUnique: vi.fn() } }
}))

vi.stubGlobal('getUserSession', getUserSessionMock)
vi.mock('../server/utils/prisma', () => ({ prisma: prismaMock }))

const { requireAdmin, requireUser } = await import('../server/services/security/access-control.service')
const secure = { accountSessionId: 'test-session' }

function activeSession<T>(user: T) {
  return { user, expiresAt: new Date(Date.now() + 60_000) }
}

function expectApiError(error: unknown, statusCode: number, code: string, statusMessage: string) {
  expect(error).toMatchObject({
    statusCode,
    message: statusMessage,
    data: {
      code,
      message: statusMessage
    }
  })
}

describe('requireUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects missing users', async () => {
    getUserSessionMock.mockResolvedValue({ user: null })

    try {
      await requireUser({} as never)
      throw new Error('Expected requireUser to throw')
    } catch (error) {
      expectApiError(error, 401, 'AUTH_REQUIRED', '未登录或登录已过期')
    }
  })

  it('rejects sessions without a user id', async () => {
    getUserSessionMock.mockResolvedValue({ user: { role: 'ADMIN' }, secure })

    try {
      await requireUser({} as never)
      throw new Error('Expected requireUser to throw')
    } catch (error) {
      expectApiError(error, 401, 'AUTH_REQUIRED', '未登录或登录已过期')
    }
  })

  it('returns authenticated session users', async () => {
    const sessionUser = { id: 1, username: 'old-name', role: 'USER' }
    const databaseUser = { id: 1, username: 'admin', email: null, role: 'ADMIN', status: 'ACTIVE' }
    getUserSessionMock.mockResolvedValue({ user: sessionUser, secure })
    prismaMock.accountSession.findUnique.mockResolvedValue(activeSession(databaseUser))

    await expect(requireUser({} as never)).resolves.toBe(databaseUser)
  })

  it('rejects users disabled after their session was created', async () => {
    getUserSessionMock.mockResolvedValue({ user: { id: 3, role: 'USER' }, secure })
    prismaMock.accountSession.findUnique.mockResolvedValue(activeSession({ id: 3, username: 'disabled', email: null, role: 'USER', status: 'DISABLED' }))

    await expect(requireUser({} as never)).rejects.toMatchObject({
      statusCode: 403,
      message: '账号已被禁用'
    })
  })

  it('rejects legacy, revoked and expired cookies', async () => {
    const user = { id: 1, role: 'ADMIN', status: 'ACTIVE' }
    getUserSessionMock.mockResolvedValueOnce({ user }).mockResolvedValue({ user, secure })
    prismaMock.accountSession.findUnique.mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ user, expiresAt: new Date(0) })
    await expect(requireUser({} as never)).rejects.toMatchObject({ statusCode: 401 })
    await expect(requireUser({} as never)).rejects.toMatchObject({ statusCode: 401 })
    await expect(requireUser({} as never)).rejects.toMatchObject({ statusCode: 401 })
  })
})

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects authenticated non-admin users', async () => {
    getUserSessionMock.mockResolvedValue({ user: { id: 2, username: 'user', role: 'ADMIN' }, secure })
    prismaMock.accountSession.findUnique.mockResolvedValue(activeSession({ id: 2, username: 'user', email: null, role: 'USER', status: 'ACTIVE' }))

    try {
      await requireAdmin({} as never)
      throw new Error('Expected requireAdmin to throw')
    } catch (error) {
      expectApiError(error, 403, 'ADMIN_REQUIRED', '没有后台访问权限')
    }
  })

  it('returns admin users', async () => {
    const user = { id: 1, username: 'admin', email: null, role: 'ADMIN', status: 'ACTIVE' }
    getUserSessionMock.mockResolvedValue({ user: { id: 1, username: 'admin', role: 'ADMIN' }, secure })
    prismaMock.accountSession.findUnique.mockResolvedValue(activeSession(user))

    await expect(requireAdmin({} as never)).resolves.toBe(user)
  })
})

describe('admin API protection', () => {
  it('keeps every admin route guarded by requireAdmin(event)', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..')
    const adminApiDir = join(root, 'server/api/admin')
    const routeFiles = listTypeScriptFiles(adminApiDir)

    expect(routeFiles.length).toBeGreaterThan(0)

    const unguarded = routeFiles
      .filter((file) => !readFileSync(file, 'utf8').includes('requireAdmin(event)'))
      .map((file) => relative(root, file))

    expect(unguarded).toEqual([])
  })
})

function listTypeScriptFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    const stats = statSync(path)

    if (stats.isDirectory()) {
      return listTypeScriptFiles(path)
    }

    return path.endsWith('.ts') ? [path] : []
  })
}
