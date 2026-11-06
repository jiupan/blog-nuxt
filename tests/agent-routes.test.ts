import { createApp, defineEventHandler, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { auth, publish, categories, tags } = vi.hoisted(() => ({
  auth: vi.fn(),
  publish: vi.fn(),
  categories: vi.fn(),
  tags: vi.fn()
}))
vi.mock('../server/services/agent/agent-key.service', () => ({ requireAgentToken: auth }))
vi.mock('../server/services/agent/agent-publication.service', () => ({ publishAgentPost: publish }))
vi.mock('../server/services/taxonomy/taxonomy.service', () => ({
  listAdminCategories: categories,
  listAllAdminTags: tags
}))
vi.stubGlobal('defineEventHandler', defineEventHandler)
vi.stubGlobal('useRuntimeConfig', () => ({ public: { siteUrl: 'https://fallback.example' } }))
const postRoute = (await import('../server/api/agent/posts.post')).default
const taxonomyRoute = (await import('../server/api/agent/taxonomies.get')).default
const handler = toWebHandler(
  createApp().use('/api/agent/posts', postRoute).use('/api/agent/taxonomies', taxonomyRoute)
)
const request = (body: unknown) =>
  handler(
    new Request('https://untrusted-host.example/api/agent/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  )

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('SITE_URL', 'https://blog.example/')
  vi.stubEnv('NUXT_PUBLIC_SITE_URL', '')
  auth.mockResolvedValue({ keyId: 1 })
  publish.mockResolvedValue({
    requestId: 'test-1',
    replayed: false,
    post: { id: 1, path: '/hello.html', editPath: '/admin/posts/1', status: 'PUBLISHED' }
  })
})

describe('Agent HTTP endpoints', () => {
  it('returns HTTP 201 and trusted public/edit addresses for a new article', async () => {
    const response = await request({
      requestId: 'test-1',
      title: 'Hello',
      content: '# Hello\n\n<script>plain Markdown</script>',
      status: 'PUBLISHED'
    })
    expect(response.status).toBe(201)
    const result = await response.json()
    expect(result.data.post.url).toBe('https://blog.example/hello.html')
    expect(result.data.post.editUrl).toBe('https://blog.example/admin/posts/1')
    expect(publish).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ content: '# Hello\n\n<script>plain Markdown</script>' })
    )
    expect(auth.mock.invocationCallOrder[0]).toBeLessThan(publish.mock.invocationCallOrder[0]!)
  })
  it('returns HTTP 200 for replayed requests and null for a draft public URL', async () => {
    publish.mockResolvedValue({
      requestId: 'test-1',
      replayed: true,
      post: { id: 1, path: null, editPath: '/admin/posts/1', status: 'DRAFT' }
    })
    const response = await request({ requestId: 'test-1', title: 'Hello', content: 'Draft' })
    expect(response.status).toBe(200)
    expect((await response.json()).data.post.url).toBeNull()
  })
  it.each([
    { title: '', content: 'body', requestId: 'a' },
    { title: 'title', content: 'body', requestId: 'a', postId: 99 }
  ])('returns HTTP 400 for invalid payloads without entering publication', async (body) => {
    const response = await request(body)
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      data: { code: 'VALIDATION_ERROR', issues: [expect.objectContaining({ message: expect.any(String) })] }
    })
    expect(publish).not.toHaveBeenCalled()
  })
  it('requires credentials before processing article content', async () => {
    auth.mockRejectedValue(Object.assign(new Error('Unauthorized'), { statusCode: 401 }))
    expect((await request({})).status).toBe(401)
    expect(publish).not.toHaveBeenCalled()
  })
  it('exposes only taxonomy identifiers, names and slugs in the existing order', async () => {
    categories.mockResolvedValue([
      { id: 3, name: 'First', slug: 'first', _count: { posts: 10 } },
      { id: 1, name: 'Second', slug: 'second' }
    ])
    tags.mockResolvedValue([{ id: 2, name: 'Tag', slug: 'tag', sort: 1 }])
    const response = await handler(new Request('https://blog.example/api/agent/taxonomies'))
    expect(response.status).toBe(200)
    expect((await response.json()).data).toEqual({
      categories: [
        { id: 3, name: 'First', slug: 'first' },
        { id: 1, name: 'Second', slug: 'second' }
      ],
      tags: [{ id: 2, name: 'Tag', slug: 'tag' }],
      capabilities: { tagNames: true }
    })
    expect(auth).toHaveBeenCalled()
  })
})
