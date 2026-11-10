import type { H3Event } from 'h3'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { GUEST_COOKIE_NAME } from '../server/services/comments/comment-identity.service'
import { createComment, deleteOwnComment } from '../server/services/comments/comment-write.service'
import { moderateComment } from '../server/services/comments/comment-moderation.service'
import { createCommentSchema } from '../server/services/comments/comment.schema'

const { db, tx } = vi.hoisted(() => {
  const tx = {
    post: { findFirst: vi.fn() },
    comment: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    adminAuditLog: { create: vi.fn() },
    $queryRaw: vi.fn()
  }
  const db = {
    user: { findUnique: vi.fn() },
    comment: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn()
  }
  return { db, tx }
})
vi.mock('../server/utils/prisma', () => ({ prisma: db }))

const account = { id: 7, username: 'Reader', status: 'ACTIVE', role: 'USER' }
const requestId = '550e8400-e29b-41d4-a716-446655440000'
const guestCookie = GUEST_COOKIE_NAME + '=v1.' + 'A'.repeat(43) + '.VmlzaXRvcg'
const input = createCommentSchema.parse({ body: 'Example comment', requestId, identityMode: 'ACCOUNT' })

function request(headers: Record<string, string> = {}) {
  const setHeader = vi.fn()
  const event = {
    method: 'POST',
    context: {},
    node: {
      req: { headers: { origin: 'https://blog.example', ...headers }, socket: { remoteAddress: '192.0.2.10' } },
      res: { getHeader: vi.fn(), setHeader }
    }
  } as unknown as H3Event
  return { event, setHeader }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { siteUrl: 'https://blog.example' }, session: { password: 'test-comment-secret' } }))
  vi.stubGlobal('getUserSession', vi.fn().mockResolvedValue({ user: { id: account.id, username: 'Stale name' } }))
  vi.stubGlobal('requireUserSession', vi.fn().mockResolvedValue({ user: { id: account.id, role: 'ADMIN' } }))
  db.user.findUnique.mockResolvedValue(account)
  db.comment.findUnique.mockResolvedValue(null)
  tx.post.findFirst.mockResolvedValue({ id: 1 })
  tx.comment.findUnique.mockResolvedValue(null)
  tx.comment.create.mockImplementation(({ data }) => ({ id: 2, ...data }))
  tx.comment.update.mockImplementation(({ data, where }) => ({ id: where.id, ...data }))
  tx.$queryRaw.mockResolvedValue([{ count: 1 }])
  db.$transaction.mockImplementation(callback => callback(tx))
})
afterEach(() => vi.unstubAllGlobals())

it('uses the current account identity and replays identical submissions without charging quota again', async () => {
  const { event } = request()
  const created = await createComment(event, 1, input)
  expect(created).toMatchObject({
    comment: { authorUserId: account.id, authorName: account.username, authorKind: 'ACCOUNT', status: 'VISIBLE' },
    replayed: false
  })
  db.comment.findUnique.mockResolvedValue(created.comment)
  await expect(createComment(event, 1, input)).resolves.toEqual({ comment: created.comment, replayed: true })
  await expect(createComment(event, 1, { ...input, body: 'Changed content' })).rejects.toMatchObject({ statusCode: 409 })
  expect(db.$transaction).toHaveBeenCalledTimes(1)
  expect(tx.comment.create).toHaveBeenCalledTimes(1)
})

it('holds guest submissions for moderation and keeps charging the signed-in account quota', async () => {
  const { event } = request({ cookie: guestCookie })
  const guest = createCommentSchema.parse({ body: input.body, requestId, identityMode: 'GUEST' })
  await expect(createComment(event, 1, guest)).resolves.toMatchObject({
    comment: { authorKind: 'GUEST', authorUserId: null, authorName: 'Visitor', status: 'PENDING' }
  })
  const scopes = tx.$queryRaw.mock.calls.map(([query]) => query.values[0])
  expect(scopes).toEqual(['ACCOUNT', 'ACCOUNT', 'GUEST', 'GUEST', 'IP', 'IP'])
})

it('rejects cross-origin requests and disabled accounts before the write transaction', async () => {
  await expect(createComment(request({ origin: 'https://other.example' }).event, 1, input))
    .rejects.toMatchObject({ data: { code: 'ORIGIN_NOT_ALLOWED' } })
  db.user.findUnique.mockResolvedValue({ ...account, status: 'DISABLED' })
  await expect(createComment(request({ cookie: guestCookie }).event, 1, {
    ...input, identityMode: 'GUEST'
  })).rejects.toMatchObject({ data: { code: 'COMMENT_DISABLED' } })
  expect(db.$transaction).not.toHaveBeenCalled()
})

it('returns 429 with Retry-After after the quota transaction and skips comment creation', async () => {
  const { event, setHeader } = request()
  tx.$queryRaw.mockResolvedValueOnce([{ count: 6 }])
  await expect(createComment(event, 1, input)).rejects.toMatchObject({ statusCode: 429 })
  expect(db.$transaction).toHaveBeenCalledTimes(1)
  expect(setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number))
  expect(tx.comment.create).not.toHaveBeenCalled()
})

it('keeps other authors’ comments private and requires the current database admin role for moderation', async () => {
  const { event } = request()
  db.comment.findFirst.mockResolvedValue({ id: 2, authorUserId: 8, guestTokenHash: null, status: 'VISIBLE' })
  await expect(deleteOwnComment(event, 1, 2)).rejects.toMatchObject({ statusCode: 404 })
  await expect(moderateComment(event, 2, { action: 'approve', expectedStatus: 'PENDING' }))
    .rejects.toMatchObject({ statusCode: 403 })
  expect(db.comment.update).not.toHaveBeenCalled()
  expect(db.$transaction).not.toHaveBeenCalled()
})

it('approves pending comments once and records the moderation audit', async () => {
  const { event } = request()
  db.user.findUnique.mockResolvedValue({ ...account, role: 'ADMIN' })
  tx.comment.findUnique
    .mockResolvedValueOnce({ id: 2, postId: 1, threadRootId: null })
    .mockResolvedValueOnce({ id: 2, postId: 1, status: 'PENDING' })
    .mockResolvedValueOnce({ id: 2, postId: 1, threadRootId: null })
    .mockResolvedValueOnce({ id: 2, postId: 1, status: 'VISIBLE' })
  const approve = { action: 'approve', expectedStatus: 'PENDING' } as const
  await expect(moderateComment(event, 2, approve)).resolves.toEqual({ id: 2, status: 'VISIBLE', unchanged: false })
  await expect(moderateComment(event, 2, approve)).resolves.toEqual({ id: 2, status: 'VISIBLE', unchanged: true })
  expect(tx.adminAuditLog.create).toHaveBeenCalledTimes(1)
  expect(tx.adminAuditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
    operatorId: account.id, commentId: 2, action: 'COMMENT_APPROVE', before: { status: 'PENDING' }, after: { status: 'VISIBLE' }
  }) })
})
