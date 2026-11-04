import { beforeEach, expect, it, vi } from 'vitest'
const setHeader = vi.fn()
const redirect = vi.fn()
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal(
  'getRequestURL',
  (event: { path: string }) => new URL(event.path, 'https://blog.ittx.cn')
)
vi.stubGlobal('setResponseHeader', setHeader)
vi.stubGlobal('sendRedirect', redirect)
const { default: middleware } = await import('../server/middleware/seo')
beforeEach(() => {
  setHeader.mockClear()
  redirect.mockClear()
})
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
it.each(['/', '/posts', '/archive?page=2', '/admin-guide.html', '/tags/%E5%BC%80%E5%8F%91', '/tags/%252Fexample', '/tags/%25E5'])(
  'allows public page %s',
  (path) => {
    ;(middleware as unknown as (event: unknown) => void)({ path })
    expect(setHeader).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  }
)

it.each(['/categories', '/tags'])('redirects legacy sitemap URLs under %s', (prefix) => {
  const slug = encodeURIComponent('开发')
  const event = { path: `${prefix}/${encodeURIComponent(slug)}?page=2` }
  ;(middleware as unknown as (event: unknown) => void)(event)
  expect(redirect).toHaveBeenCalledWith(event, `${prefix}/${slug}?page=2`, 301)
})
