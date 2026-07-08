import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireUserSessionMock } = vi.hoisted(() => ({
  requireUserSessionMock: vi.fn()
}))

vi.stubGlobal('requireUserSession', requireUserSessionMock)

const { requireAdmin, requireUser } = await import('../server/services/security/access-control.service')

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
    requireUserSessionMock.mockResolvedValue({ user: null })

    try {
      await requireUser({} as never)
      throw new Error('Expected requireUser to throw')
    } catch (error) {
      expectApiError(error, 401, 'AUTH_REQUIRED', '未登录或登录已过期')
    }
  })

  it('rejects sessions without a user id', async () => {
    requireUserSessionMock.mockResolvedValue({ user: { role: 'ADMIN' } })

    try {
      await requireUser({} as never)
      throw new Error('Expected requireUser to throw')
    } catch (error) {
      expectApiError(error, 401, 'AUTH_REQUIRED', '未登录或登录已过期')
    }
  })

  it('returns authenticated session users', async () => {
    const user = { id: 1, username: 'admin', role: 'ADMIN' }
    requireUserSessionMock.mockResolvedValue({ user })

    await expect(requireUser({} as never)).resolves.toBe(user)
  })
})

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects authenticated non-admin users', async () => {
    requireUserSessionMock.mockResolvedValue({ user: { id: 2, username: 'user', role: 'USER' } })

    try {
      await requireAdmin({} as never)
      throw new Error('Expected requireAdmin to throw')
    } catch (error) {
      expectApiError(error, 403, 'ADMIN_REQUIRED', '没有后台访问权限')
    }
  })

  it('returns admin users', async () => {
    const user = { id: 1, username: 'admin', role: 'ADMIN' }
    requireUserSessionMock.mockResolvedValue({ user })

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
