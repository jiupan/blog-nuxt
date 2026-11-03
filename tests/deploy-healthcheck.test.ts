import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const compose = readFileSync(new URL('../docker-compose.server.yml', import.meta.url), 'utf8')
const probe = compose.match(/ {8}- >-\r?\n((?: {10}.*\r?\n)+)/)![1]!
  .split(/\r?\n/).map(line => line.trim()).join(' ')

const response = (status: number, body: unknown) => ({ status, ok: status >= 200 && status < 300, json: async () => body })

describe('container readiness probe', () => {
  it('accepts a ready application', async () => {
    const fetch = vi.fn().mockResolvedValue(response(200, { status: 'ok' }))
    const exit = vi.fn()
    await runInNewContext(probe, { fetch, AbortSignal, process: { exit } })
    expect(exit).not.toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('supports rollback to older images that do not have the health endpoint', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(404, {}))
      .mockResolvedValueOnce(response(200, { code: 0, data: { site_title: 'Blog' } }))
    const exit = vi.fn()
    await runInNewContext(probe, { fetch, AbortSignal, process: { exit } })
    expect(exit).not.toHaveBeenCalled()
    expect(fetch.mock.calls.map(call => call[0])).toEqual(['http://127.0.0.1:3000/api/health', 'http://127.0.0.1:3000/api/settings'])
  })

  it.each([
    [503, { status: 'unavailable' }],
    [500, { status: 'ok' }],
    [200, { status: 'unavailable' }]
  ])('rejects unhealthy responses without falling back: %i', async (status, body) => {
    const fetch = vi.fn().mockResolvedValue(response(status, body))
    const exit = vi.fn()
    await runInNewContext(probe, { fetch, AbortSignal, process: { exit } })
    expect(exit).toHaveBeenCalledWith(1)
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('rejects invalid legacy API responses', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(404, {})).mockResolvedValueOnce(response(200, { code: 1 }))
    const exit = vi.fn()
    await runInNewContext(probe, { fetch, AbortSignal, process: { exit } })
    expect(exit).toHaveBeenCalledWith(1)
  })

  it('rejects connection failures', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('connection refused'))
    const exit = vi.fn()
    await runInNewContext(probe, { fetch, AbortSignal, process: { exit } })
    expect(exit).toHaveBeenCalledWith(1)
  })
})
