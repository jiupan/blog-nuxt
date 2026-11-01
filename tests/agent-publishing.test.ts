import { Prisma } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { db, tx, createPost, sync, header, responseHeader } = vi.hoisted(() => {
  const model = () => ({
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn()
  })
  return {
    db: { agentApiKey: model(), agentPublication: model(), $transaction: vi.fn() },
    tx: { agentApiKey: model(), agentPublication: model(), category: model(), tag: model() },
    createPost: vi.fn(),
    sync: vi.fn(),
    header: vi.fn(),
    responseHeader: vi.fn()
  }
})
vi.mock('../server/utils/prisma', () => ({ prisma: db }))
vi.mock('../server/services/posts/post.service', () => ({
  createPost,
  autoSyncPublishedPost: sync
}))
vi.mock('h3', async () => ({
  ...(await vi.importActual('h3')),
  getHeader: header,
  setResponseHeader: responseHeader
}))
const { agentPostSchema } = await import('../server/services/agent/agent.schema')
const { createAgentKey, hashAgentToken, listAgentKeys, requireAgentToken, revokeAgentKey } =
  await import('../server/services/agent/agent-key.service')
const { publishAgentPost, hashAgentPayload } =
  await import('../server/services/agent/agent-publication.service')
const input = () =>
  agentPostSchema.parse({
    requestId: 'daily-ai-1',
    title: 'AI 动态',
    content: '# 标题\n\n正文',
    status: 'PUBLISHED',
    categoryId: 2,
    tagIds: [3, 1],
    sources: [{ title: '原文', url: 'https://example.com/news' }]
  })
const post = {
  id: 12,
  slug: 'ai-update',
  title: 'AI 动态',
  status: 'PUBLISHED',
  publishedAt: new Date('2026-11-01T01:00:00Z')
}
const validKey = { id: 77, revokedAt: null, createdBy: { role: 'ADMIN', status: 'ACTIVE' } }

beforeEach(() => {
  vi.resetAllMocks()
  db.$transaction.mockImplementation(
    (work: ((client: typeof tx) => unknown) | Promise<unknown>[]) =>
      Array.isArray(work) ? Promise.all(work) : work(tx)
  )
  tx.agentApiKey.findUnique.mockResolvedValue(validKey)
  tx.agentApiKey.update.mockResolvedValue({})
  tx.agentPublication.findUnique.mockResolvedValue(null)
  tx.agentPublication.create.mockResolvedValue({ id: 9 })
  tx.agentPublication.update.mockResolvedValue({ id: 9 })
  tx.category.findUnique.mockResolvedValue({ id: 2 })
  tx.tag.count.mockResolvedValue(2)
  db.agentPublication.upsert.mockResolvedValue({})
  db.agentPublication.updateMany.mockResolvedValue({ count: 1 })
  createPost.mockResolvedValue(post)
  sync.mockResolvedValue(undefined)
})

describe('Agent credentials', () => {
  it('creates 256-bit random credentials, persists only the digest and returns the secret once', async () => {
    db.agentApiKey.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 1, name: data.name, prefix: data.prefix })
    )
    const first = await createAgentKey('Laptop', 1)
    const second = await createAgentKey('Laptop', 1)
    expect(first.token).toMatch(/^blog_agent_[A-Za-z0-9_-]{43}$/)
    expect(second.token).not.toBe(first.token)
    const call = db.agentApiKey.create.mock.calls[0][0]
    expect(call.data.tokenHash).toBe(hashAgentToken(first.token))
    expect(JSON.stringify(call.data)).not.toContain(first.token)
    expect(call.select).not.toHaveProperty('tokenHash')
    await listAgentKeys()
    expect(db.agentApiKey.findMany.mock.calls[0][0].select).not.toHaveProperty('tokenHash')
  })
  it.each([undefined, '', 'Basic aaa', 'Bearer invalid', 'Bearer blog_agent_short'])(
    'rejects malformed or missing credentials without touching the database',
    async (authorization) => {
      header.mockReturnValue(authorization)
      await expect(requireAgentToken({} as never)).rejects.toMatchObject({ statusCode: 401 })
      expect(db.agentApiKey.findUnique).not.toHaveBeenCalled()
    }
  )
  it.each([
    null,
    { ...validKey, revokedAt: new Date() },
    { ...validKey, createdBy: null },
    { ...validKey, createdBy: { role: 'USER', status: 'ACTIVE' } },
    { ...validKey, createdBy: { role: 'ADMIN', status: 'DISABLED' } }
  ])('rejects invalid, revoked or no-longer-authorized credentials', async (key) => {
    header.mockReturnValue(`Bearer blog_agent_${'a'.repeat(43)}`)
    db.agentApiKey.findUnique.mockResolvedValue(key)
    await expect(requireAgentToken({} as never)).rejects.toMatchObject({ statusCode: 401 })
    expect(db.agentApiKey.update).not.toHaveBeenCalled()
  })
  it('looks up the digest, limits valid requests and disables caching', async () => {
    const token = `blog_agent_${'a'.repeat(43)}`
    header.mockReturnValue(`Bearer ${token}`)
    db.agentApiKey.findUnique.mockResolvedValue({ ...validKey, id: 888 })
    db.agentApiKey.update.mockResolvedValue({})
    for (let i = 0; i < 60; i++) await requireAgentToken({} as never)
    expect(db.agentApiKey.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: hashAgentToken(token) } })
    )
    expect(responseHeader).toHaveBeenCalledWith({}, 'Cache-Control', 'no-store')
    await expect(requireAgentToken({} as never)).rejects.toMatchObject({ statusCode: 429 })
    expect(responseHeader).toHaveBeenCalledWith({}, 'Retry-After', expect.any(Number))
  })
  it('revokes once and remains safe to revoke again', async () => {
    db.agentApiKey.updateMany.mockResolvedValue({ count: 0 })
    db.agentApiKey.findUnique.mockResolvedValue({ id: 1 })
    await expect(revokeAgentKey(1)).resolves.toEqual({ id: 1 })
    expect(db.agentApiKey.updateMany).toHaveBeenCalledWith({
      where: { id: 1, revokedAt: null },
      data: { revokedAt: expect.any(Date) }
    })
    db.agentApiKey.findUnique.mockResolvedValue(null)
    await expect(revokeAgentKey(99)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('Agent article contract', () => {
  it('defaults to a draft, normalizes tag IDs and hashes parsed payloads deterministically', () => {
    const a = agentPostSchema.parse({
      title: ' Test ',
      content: ' Content ',
      requestId: 'one',
      tagIds: [3, 1, 3]
    })
    const b = agentPostSchema.parse({
      content: 'Content',
      tagIds: [1, 3],
      requestId: 'one',
      status: 'DRAFT',
      title: 'Test'
    })
    expect(a.status).toBe('DRAFT')
    expect(a.tagIds).toEqual([1, 3])
    expect(hashAgentPayload(a)).toBe(hashAgentPayload(b))
  })
  it.each([
    { title: ' ' },
    { content: ' ' },
    { content: 'x'.repeat(200_001) },
    { status: 'ARCHIVED' },
    { requestId: 'bad id' },
    { tagIds: [0] },
    { isPinned: true },
    { authorId: 1 },
    { sources: [{ title: '原文', url: 'javascript:alert(1)' }] },
    { sources: [{ title: '原文', url: 'https://user:secret@example.com/' }] },
    { cover: 'javascript:alert(1)' }
  ])('rejects invalid article fields and capabilities outside create-only access', (override) => {
    expect(agentPostSchema.safeParse({ ...input(), ...override }).success).toBe(false)
  })
})

describe('Agent atomic publication', () => {
  it('creates the record and article in the same serializable transaction, then syncs after commit', async () => {
    const result = await publishAgentPost(77, input())
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable'
    })
    expect(createPost).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PUBLISHED', isPinned: false }),
      tx
    )
    expect(tx.agentPublication.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        keyId: 77,
        requestId: 'daily-ai-1',
        sources: input().sources
      })
    })
    expect(tx.agentPublication.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { status: 'SUCCESS', postId: 12, error: null }
    })
    expect(sync).toHaveBeenCalledWith(12, 'PUBLISHED')
    expect(result).toEqual({
      requestId: 'daily-ai-1',
      replayed: false,
      post: { ...post, path: '/ai-update.html', editPath: '/admin/posts/12' }
    })
  })
  it('returns no public address for a draft and no body fields from the internal Post model', async () => {
    createPost.mockResolvedValue({
      ...post,
      status: 'DRAFT',
      publishedAt: null,
      content: 'private draft body'
    })
    const result = await publishAgentPost(77, { ...input(), status: 'DRAFT' })
    expect(result.post.path).toBeNull()
    expect(result.post).not.toHaveProperty('content')
  })
  it('returns the existing article on a network retry without creating or syncing again', async () => {
    tx.agentPublication.findUnique.mockResolvedValue({
      status: 'SUCCESS',
      payloadHash: hashAgentPayload(input()),
      post
    })
    const result = await publishAgentPost(77, input())
    expect(result.replayed).toBe(true)
    expect(createPost).not.toHaveBeenCalled()
    expect(sync).not.toHaveBeenCalled()
  })
  it('rejects reuse of the same request ID for different content without overwriting its record', async () => {
    tx.agentPublication.findUnique.mockResolvedValue({
      status: 'SUCCESS',
      payloadHash: 'other-content',
      post
    })
    await expect(publishAgentPost(77, input())).rejects.toMatchObject({ statusCode: 409 })
    expect(createPost).not.toHaveBeenCalled()
    expect(db.agentPublication.upsert).not.toHaveBeenCalled()
  })
  it('does not recreate an article deleted after successful publication', async () => {
    tx.agentPublication.findUnique.mockResolvedValue({
      status: 'SUCCESS',
      payloadHash: hashAgentPayload(input()),
      post: null
    })
    await expect(publishAgentPost(77, input())).rejects.toMatchObject({ statusCode: 409 })
    expect(createPost).not.toHaveBeenCalled()
  })
  it('rechecks revocation inside the transaction', async () => {
    tx.agentApiKey.findUnique.mockResolvedValue({ ...validKey, revokedAt: new Date() })
    await expect(publishAgentPost(77, input())).rejects.toMatchObject({ statusCode: 401 })
    expect(createPost).not.toHaveBeenCalled()
    expect(db.agentPublication.upsert).not.toHaveBeenCalled()
  })
  it.each(['category', 'tag'])(
    'rejects nonexistent %s IDs and records a recoverable failure',
    async (kind) => {
      if (kind === 'category') tx.category.findUnique.mockResolvedValue(null)
      else tx.tag.count.mockResolvedValue(1)
      await expect(publishAgentPost(77, input())).rejects.toMatchObject({ statusCode: 400 })
      expect(createPost).not.toHaveBeenCalled()
      expect(db.agentPublication.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ status: 'FAILED' }),
          update: {}
        })
      )
    }
  )
  it('retains a failure record without exposing internal errors, and retries that record', async () => {
    createPost.mockRejectedValueOnce(new Error('database internal details'))
    await expect(publishAgentPost(77, input())).rejects.toThrow('database internal details')
    expect(db.agentPublication.upsert.mock.calls[0][0].create.error).not.toContain('internal')
    tx.agentPublication.findUnique.mockResolvedValue({
      id: 9,
      status: 'FAILED',
      payloadHash: hashAgentPayload(input()),
      post: null
    })
    await expect(publishAgentPost(77, input())).resolves.toMatchObject({ replayed: false })
    expect(tx.agentPublication.create).toHaveBeenCalledTimes(1)
    expect(tx.agentPublication.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { status: 'PENDING', error: null }
    })
  })
  it.each(['P2034', 'P2002'])(
    'retries a concurrent %s conflict and returns the winning article',
    async (code) => {
      db.$transaction.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('concurrent request', {
          code,
          clientVersion: 'test'
        })
      )
      tx.agentPublication.findUnique.mockResolvedValue({
        status: 'SUCCESS',
        payloadHash: hashAgentPayload(input()),
        post
      })
      await expect(publishAgentPost(77, input())).resolves.toMatchObject({ replayed: true })
      expect(db.$transaction).toHaveBeenCalledTimes(2)
      expect(createPost).not.toHaveBeenCalled()
    }
  )
  it('bounds transaction retries and does not overwrite another request after contention', async () => {
    db.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('concurrent request', {
        code: 'P2034',
        clientVersion: 'test'
      })
    )
    await expect(publishAgentPost(77, input())).rejects.toMatchObject({ statusCode: 409 })
    expect(db.$transaction).toHaveBeenCalledTimes(3)
    expect(db.agentPublication.upsert).not.toHaveBeenCalled()
  })
  it('does not report a committed article as failed when knowledge indexing is unavailable', async () => {
    sync.mockRejectedValue(new Error('indexer unavailable'))
    await expect(publishAgentPost(77, input())).resolves.toMatchObject({ replayed: false })
    expect(db.agentPublication.upsert).not.toHaveBeenCalled()
  })
})
