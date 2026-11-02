import { expect, it, vi } from 'vitest'
const { posts, categories, tags } = vi.hoisted(() => ({
  posts: vi.fn(),
  categories: vi.fn(),
  tags: vi.fn()
}))
vi.mock('../server/services/posts/post-query.service', () => ({ listSitemapPosts: posts }))
vi.mock('../server/services/taxonomy/taxonomy.service', () => ({
  listPublicCategories: categories,
  listPublicTags: tags
}))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
const { default: sitemapHandler } = await import('../server/api/__sitemap__/urls.get')
it('publishes only public content and populated taxonomy URLs', async () => {
  posts.mockResolvedValue([{ slug: 'article-one', updatedAt: '2026-11-02T01:00:00Z' }])
  categories.mockResolvedValue([
    { slug: 'AI 工程', _count: { posts: 2 } },
    { slug: 'empty', _count: { posts: 0 } }
  ])
  tags.mockResolvedValue([{ slug: 'nuxt', _count: { posts: 1 } }])
  const urls = await (
    sitemapHandler as unknown as () => Promise<{ loc: string; lastmod?: string }[]>
  )()
  expect(urls).toContainEqual({ loc: '/article-one.html', lastmod: '2026-11-02T01:00:00Z' })
  expect(urls.map((item) => item.loc)).toContain('/categories/AI%20%E5%B7%A5%E7%A8%8B')
  expect(urls.map((item) => item.loc)).toContain('/tags/nuxt')
  expect(urls.some((item) => /admin|login|register|empty|resume-print/.test(item.loc))).toBe(false)
})
