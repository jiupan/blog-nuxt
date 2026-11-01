import { Prisma } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { db, tx } = vi.hoisted(() => {
  const model = () => ({
    findMany: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    aggregate: vi.fn(),
    count: vi.fn()
  })
  return {
    db: { $transaction: vi.fn(), category: model(), tag: model() },
    tx: { category: model(), tag: model() }
  }
})
vi.mock('../server/utils/prisma', () => ({ prisma: db }))
vi.mock('../server/services/posts/post-query.service', () => ({
  buildPublishedPostWhere: () => ({ status: 'PUBLISHED' })
}))
const { saveTaxonomyOrder, taxonomyOrderSchema } =
  await import('../server/services/taxonomy/taxonomy-order.service')
const {
  listAdminCategories,
  listPublicCategories,
  listAllAdminTags,
  listAdminTags,
  listPublicTags,
  createCategory,
  createTag,
  updateCategory,
  createCategorySchema,
  updateCategorySchema
} = await import('../server/services/taxonomy/taxonomy.service')

beforeEach(() => {
  vi.clearAllMocks()
  db.$transaction.mockImplementation(
    (work: ((client: typeof tx) => unknown) | Promise<unknown>[]) =>
      Array.isArray(work) ? Promise.all(work) : work(tx)
  )
  for (const kind of ['category', 'tag'] as const) {
    tx[kind].findMany.mockResolvedValue([
      { id: 1, sort: 0 },
      { id: 2, sort: 1 },
      { id: 3, sort: 2 }
    ])
    tx[kind].update.mockResolvedValue({})
    db[kind].findMany.mockResolvedValue([])
    db[kind].count.mockResolvedValue(0)
    db[kind].aggregate.mockResolvedValue({ _max: { sort: 9 } })
    db[kind].create.mockResolvedValue({})
    db[kind].update.mockResolvedValue({})
  }
})

describe('taxonomy order persistence', () => {
  it.each(['category', 'tag'] as const)('saves a complete %s order atomically', async (kind) => {
    await expect(
      saveTaxonomyOrder(kind, { ids: [3, 1, 2], expectedIds: [1, 2, 3] })
    ).resolves.toEqual({ ids: [3, 1, 2] })
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable'
    })
    expect(tx[kind].update.mock.calls.map(([query]) => query)).toEqual([
      { where: { id: 3 }, data: { sort: 0 } },
      { where: { id: 1 }, data: { sort: 1 } },
      { where: { id: 2 }, data: { sort: 2 } }
    ])
  })

  it.each([
    { ids: [2, 1], expectedIds: [1, 2, 3] },
    { ids: [1, 2, 4], expectedIds: [1, 2, 3] },
    { ids: [1, 1, 3], expectedIds: [1, 2, 3] },
    { ids: [3, 2, 1], expectedIds: [2, 1, 3] }
  ])('rejects incomplete, foreign, duplicate or stale lists before any writes', async (input) => {
    await expect(saveTaxonomyOrder('category', input)).rejects.toMatchObject({ statusCode: 409 })
    expect(tx.category.update).not.toHaveBeenCalled()
  })

  it('does not rewrite an unchanged order', async () => {
    await saveTaxonomyOrder('tag', { ids: [1, 2, 3], expectedIds: [1, 2, 3] })
    expect(tx.tag.update).not.toHaveBeenCalled()
  })

  it('propagates a failed write through the transaction instead of reporting success', async () => {
    tx.category.update.mockRejectedValueOnce(new Error('write failed'))
    await expect(
      saveTaxonomyOrder('category', { ids: [2, 1, 3], expectedIds: [1, 2, 3] })
    ).rejects.toThrow('write failed')
  })

  it('retries serialization conflicts and rechecks the current list', async () => {
    db.$transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: 'test' })
    )
    await saveTaxonomyOrder('tag', { ids: [2, 1, 3], expectedIds: [1, 2, 3] })
    expect(db.$transaction).toHaveBeenCalledTimes(2)
  })

  it('turns repeated serialization conflicts into an actionable response', async () => {
    db.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: 'test' })
    )
    await expect(
      saveTaxonomyOrder('tag', { ids: [2, 1, 3], expectedIds: [1, 2, 3] })
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(db.$transaction).toHaveBeenCalledTimes(3)
  })

  it('validates integer IDs, uniqueness and the concurrency snapshot', () => {
    expect(taxonomyOrderSchema.safeParse({ ids: [1, 1], expectedIds: [1, 2] }).success).toBe(false)
    expect(taxonomyOrderSchema.safeParse({ ids: [0, 2.5], expectedIds: [1, 2] }).success).toBe(
      false
    )
    expect(taxonomyOrderSchema.safeParse({ ids: [1, 2] }).success).toBe(false)
    expect(taxonomyOrderSchema.safeParse({ ids: [2, 1], expectedIds: [1, 2] }).success).toBe(true)
  })
})

describe('taxonomy display order', () => {
  it('uses the same manual order in public, admin and paginated lists', async () => {
    await listAdminCategories()
    await listPublicCategories()
    await listAllAdminTags()
    await listPublicTags()
    await listAdminTags({ page: 1, pageSize: 20, search: '' })
    const expected = [{ sort: 'asc' }, { id: 'asc' }]
    for (const call of [...db.category.findMany.mock.calls, ...db.tag.findMany.mock.calls])
      expect(call[0].orderBy).toEqual(expected)
  })

  it('appends new categories and tags to the existing order', async () => {
    await createCategory({ name: 'New', slug: 'new', icon: '' })
    await createTag({ name: 'New', slug: 'new' })
    expect(db.category.create).toHaveBeenCalledWith({ data: expect.objectContaining({ sort: 10 }) })
    expect(db.tag.create).toHaveBeenCalledWith({ data: expect.objectContaining({ sort: 10 }) })
    db.tag.aggregate.mockResolvedValue({ _max: { sort: null } })
    await createTag({ name: 'First', slug: 'first' })
    expect(db.tag.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ sort: 0 }) })
  })

  it('does not reset sort position when editing names and icons', async () => {
    await updateCategory(2, { name: 'Renamed', slug: 'renamed', icon: '' })
    expect(db.category.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { name: 'Renamed', slug: 'renamed', icon: null }
    })
  })

  it('persists featured categories and defaults new categories to unfeatured', async () => {
    await createCategory(createCategorySchema.parse({ name: 'Default' }))
    expect(db.category.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({ isFeatured: false })
    })
    await createCategory(createCategorySchema.parse({ name: 'Featured', isFeatured: true }))
    expect(db.category.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({ isFeatured: true })
    })
  })

  it.each([true, false])('allows explicitly setting featured to %s without changing sort', async (isFeatured) => {
    await updateCategory(2, updateCategorySchema.parse({ name: 'AI', slug: 'ai', isFeatured }))
    expect(db.category.update).toHaveBeenLastCalledWith({
      where: { id: 2 },
      data: { name: 'AI', slug: 'ai', icon: null, isFeatured }
    })
  })

  it('rejects strings instead of interpreting a false string as true', () => {
    expect(createCategorySchema.safeParse({ name: 'AI', isFeatured: 'false' }).success).toBe(false)
  })
})
