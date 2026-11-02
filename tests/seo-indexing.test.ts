import { beforeEach, expect, it, vi } from 'vitest'
const setHeader = vi.fn()
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal(
  'getRequestURL',
  (event: { path: string }) => new URL(event.path, 'https://blog.ittx.cn')
)
vi.stubGlobal('setResponseHeader', setHeader)
const { default: middleware } = await import('../server/middleware/seo')
beforeEach(() => setHeader.mockClear())
it.each([
  '/admin',
  '/admin/login',
  '/login',
  '/register',
  '/resume-print/private-token',
  '/api/posts'
])('prevents indexing %s at the response level', (path) => {
  ;(middleware as unknown as (event: unknown) => void)({ path })
  expect(setHeader).toHaveBeenCalledWith({ path }, 'X-Robots-Tag', 'noindex, nofollow')
})
it.each(['/', '/posts', '/archive?page=2', '/admin-guide.html'])(
  'allows public page %s',
  (path) => {
    ;(middleware as unknown as (event: unknown) => void)({ path })
    expect(setHeader).not.toHaveBeenCalled()
  }
)
