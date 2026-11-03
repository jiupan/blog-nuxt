import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query } = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('../server/utils/prisma', () => ({ prisma: { $queryRaw: query } }))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
const setHeader = vi.fn()
const setStatus = vi.fn()
vi.stubGlobal('setResponseHeader', setHeader)
vi.stubGlobal('setResponseStatus', setStatus)
const { default: handler } = await import('../server/api/health.get')
const check = handler as unknown as (event: unknown) => Promise<{ status: string }>

describe('application readiness', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reports ready only after the database responds and disables caching', async () => {
    query.mockResolvedValue([{ '?column?': 1 }])
    expect(await check({})).toEqual({ status: 'ok' })
    expect(query).toHaveBeenCalledOnce()
    expect(setHeader).toHaveBeenCalledWith({}, 'Cache-Control', 'no-store')
    expect(setStatus).not.toHaveBeenCalled()
  })

  it('returns 503 without exposing connection details when the database fails', async () => {
    query.mockRejectedValue(new Error('database connection details'))
    expect(await check({})).toEqual({ status: 'unavailable' })
    expect(setStatus).toHaveBeenCalledWith({}, 503)
  })
})
