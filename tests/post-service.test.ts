import { PostStatus, Prisma } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    post: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn()
    }
  }
}))

vi.mock('../server/utils/prisma', () => ({
  prisma: prismaMock
}))

const {
  createPost,
  createPostSchema,
  deletePost,
  updatePost,
  updatePostSchema
} = await import('../server/services/posts/post.service')

function createPrismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('Prisma error', {
    code,
    clientVersion: 'test'
  })
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

describe('createPostSchema', () => {
  it('applies draft status and empty tag defaults', () => {
    expect(createPostSchema.parse({
      title: 'Hello',
      content: 'Content'
    })).toMatchObject({
      title: 'Hello',
      content: 'Content',
      status: PostStatus.DRAFT,
      tagIds: []
    })
  })
})

describe('createPost', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes custom slug, de-duplicates tags and keeps drafts unpublished', async () => {
    prismaMock.post.create.mockResolvedValue({ id: 1 })

    await createPost(createPostSchema.parse({
      title: 'Hello',
      slug: ' Hello World.HTML ',
      content: 'Content',
      tagIds: [2, 2, 3]
    }))

    expect(prismaMock.post.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Hello',
        slug: 'hello-world',
        content: 'Content',
        status: PostStatus.DRAFT,
        publishedAt: null,
        tags: {
          create: [{ tagId: 2 }, { tagId: 3 }]
        }
      })
    })
  })

  it('sets publishedAt when creating a published post', async () => {
    prismaMock.post.create.mockResolvedValue({ id: 1 })

    await createPost(createPostSchema.parse({
      title: 'Published',
      slug: 'published',
      content: 'Content',
      status: PostStatus.PUBLISHED
    }))

    const call = prismaMock.post.create.mock.calls[0][0]
    expect(call.data.publishedAt).toBeInstanceOf(Date)
  })

  it('sets pinnedAt when creating a pinned post', async () => {
    prismaMock.post.create.mockResolvedValue({ id: 1 })

    await createPost(createPostSchema.parse({
      title: 'Pinned',
      slug: 'pinned',
      content: 'Content',
      isPinned: true
    }))

    const call = prismaMock.post.create.mock.calls[0][0]
    expect(call.data.isPinned).toBe(true)
    expect(call.data.pinnedAt).toBeInstanceOf(Date)
  })

  it('translates unique slug conflicts into API conflict errors', async () => {
    prismaMock.post.create.mockRejectedValue(createPrismaError('P2002'))

    try {
      await createPost(createPostSchema.parse({
        title: 'Conflict',
        slug: 'conflict',
        content: 'Content'
      }))
      throw new Error('Expected createPost to throw')
    } catch (error) {
      expectApiError(error, 409, 'CONFLICT', '文章别名已存在，请换一个别名后重试')
    }
  })
})

describe('updatePost', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('publishes a draft with a new publishedAt and replaces tags', async () => {
    prismaMock.post.findUnique.mockResolvedValue({ id: 1, publishedAt: null })
    prismaMock.post.update.mockResolvedValue({ id: 1 })

    await updatePost(1, updatePostSchema.parse({
      title: 'Updated',
      slug: ' Updated Post.HTML ',
      content: 'Content',
      status: PostStatus.PUBLISHED,
      tagIds: [1, 1, 2]
    }))

    const call = prismaMock.post.update.mock.calls[0][0]
    expect(call).toMatchObject({
      where: { id: 1 },
      data: expect.objectContaining({
        title: 'Updated',
        slug: 'updated-post',
        status: PostStatus.PUBLISHED,
        tags: {
          deleteMany: {},
          create: [{ tagId: 1 }, { tagId: 2 }]
        }
      })
    })
    expect(call.data.publishedAt).toBeInstanceOf(Date)
  })

  it('preserves existing publishedAt when updating an already published post', async () => {
    const publishedAt = new Date('2026-01-02T03:04:05.000Z')
    prismaMock.post.findUnique.mockResolvedValue({ id: 1, publishedAt })
    prismaMock.post.update.mockResolvedValue({ id: 1 })

    await updatePost(1, updatePostSchema.parse({
      title: 'Updated',
      slug: 'updated',
      content: 'Content',
      status: PostStatus.PUBLISHED
    }))

    expect(prismaMock.post.update.mock.calls[0][0].data.publishedAt).toBe(publishedAt)
  })

  it('preserves pinning when update input omits pinned state', async () => {
    const pinnedAt = new Date('2026-01-02T03:04:05.000Z')
    prismaMock.post.findUnique.mockResolvedValue({ id: 1, publishedAt: null, isPinned: true, pinnedAt })
    prismaMock.post.update.mockResolvedValue({ id: 1 })

    await updatePost(1, updatePostSchema.parse({
      title: 'Updated',
      slug: 'updated',
      content: 'Content',
      status: PostStatus.DRAFT
    }))

    const call = prismaMock.post.update.mock.calls[0][0]
    expect(call.data.isPinned).toBe(true)
    expect(call.data.pinnedAt).toBe(pinnedAt)
  })

  it('clears publishedAt when moving a post out of published status', async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      id: 1,
      publishedAt: new Date('2026-01-02T03:04:05.000Z')
    })
    prismaMock.post.update.mockResolvedValue({ id: 1 })

    await updatePost(1, updatePostSchema.parse({
      title: 'Archived',
      slug: 'archived',
      content: 'Content',
      status: PostStatus.ARCHIVED
    }))

    expect(prismaMock.post.update.mock.calls[0][0].data.publishedAt).toBeNull()
  })

  it('rejects empty normalized slugs', async () => {
    prismaMock.post.findUnique.mockResolvedValue({ id: 1, publishedAt: null })

    try {
      await updatePost(1, updatePostSchema.parse({
        title: 'Updated',
        slug: '***',
        content: 'Content',
        status: PostStatus.DRAFT
      }))
      throw new Error('Expected updatePost to throw')
    } catch (error) {
      expectApiError(error, 400, 'BAD_REQUEST', '文章别名不能为空')
    }
  })

  it('returns not found when updating a missing post', async () => {
    prismaMock.post.findUnique.mockResolvedValue(null)

    try {
      await updatePost(404, updatePostSchema.parse({
        title: 'Missing',
        slug: 'missing',
        content: 'Content',
        status: PostStatus.DRAFT
      }))
      throw new Error('Expected updatePost to throw')
    } catch (error) {
      expectApiError(error, 404, 'NOT_FOUND', '文章不存在')
    }
  })
})

describe('deletePost', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes posts by id', async () => {
    prismaMock.post.delete.mockResolvedValue({ id: 1 })

    await deletePost(1)

    expect(prismaMock.post.delete).toHaveBeenCalledWith({ where: { id: 1 } })
  })

  it('translates Prisma missing-record errors into API not found errors', async () => {
    prismaMock.post.delete.mockRejectedValue(createPrismaError('P2025'))

    try {
      await deletePost(404)
      throw new Error('Expected deletePost to throw')
    } catch (error) {
      expectApiError(error, 404, 'NOT_FOUND', '文章不存在')
    }
  })
})
