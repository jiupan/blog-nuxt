import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $executeRawUnsafe: vi.fn(),
    $queryRawUnsafe: vi.fn(),
    postChunk: {
      count: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      groupBy: vi.fn()
    }
  }
}))

vi.mock('../server/utils/prisma', () => ({
  prisma: prismaMock
}))

const {
  deletePostChunksByPostId,
  getPostChunkIndexStats,
  insertPostChunk,
  keywordSearchPostChunks,
  vectorSearchPostChunks
} = await import('../server/services/rag/post-chunk.repository')

describe('post chunk repository writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes post chunks by post id', async () => {
    await deletePostChunksByPostId(12)

    expect(prismaMock.postChunk.deleteMany).toHaveBeenCalledWith({ where: { postId: 12 } })
  })

  it('inserts chunks with vector literal and JSON tag ids as bound parameters', async () => {
    await insertPostChunk({
      postId: 1,
      chunkIndex: 2,
      title: 'Title',
      slug: 'title',
      summary: '',
      content: 'Content',
      headingPath: '',
      contentHash: 'hash',
      tokenCount: 42,
      categoryId: 3,
      tagIds: [4, 5],
      embeddingText: 'text'
    }, [0.1, Number.NaN, 0.333333333], 'text-embedding-3-small', 1536)

    const [sql, ...params] = prismaMock.$executeRawUnsafe.mock.calls[0]

    expect(sql).toContain('INSERT INTO "PostChunk"')
    expect(sql).toContain('$14::vector')
    expect(params).toEqual([
      1,
      2,
      'Title',
      'title',
      null,
      'Content',
      null,
      'hash',
      42,
      3,
      '[4,5]',
      'text-embedding-3-small',
      1536,
      '[0.10000000,0,0.33333333]'
    ])
  })
})

describe('post chunk repository stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('combines count, stale count, indexed posts, latest chunk and model stats', async () => {
    const latest = new Date('2026-01-02T03:04:05.000Z')
    prismaMock.postChunk.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(2)
    prismaMock.postChunk.groupBy
      .mockResolvedValueOnce([{ postId: 1, _count: { postId: 3 } }, { postId: 2, _count: { postId: 2 } }])
      .mockResolvedValueOnce([{ embeddingModel: 'model-a', embeddingDim: 1536, _count: { id: 10 } }])
    prismaMock.postChunk.findFirst.mockResolvedValue({ indexedAt: latest })

    await expect(getPostChunkIndexStats()).resolves.toEqual({
      chunkCount: 10,
      staleCount: 2,
      indexedPostCount: 2,
      lastIndexedAt: latest,
      models: [{ model: 'model-a', dimensions: 1536, chunks: 10 }]
    })
  })
})

describe('post chunk repository search SQL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.$queryRawUnsafe.mockResolvedValue([])
  })

  it('vector search filters active chunks to currently published posts', async () => {
    await vectorSearchPostChunks([0.25, 0.5], 'model-a', 768, { categoryId: 9, tagId: 10 })

    const [sql, ...params] = prismaMock.$queryRawUnsafe.mock.calls[0]

    expect(sql).toContain('c."embedding" <=> $1::vector AS "distance"')
    expect(sql).toContain('JOIN "Post" p ON p."id" = c."postId"')
    expect(sql).toContain('c."status" = \'ACTIVE\'')
    expect(sql).toContain('p."status" = \'PUBLISHED\'')
    expect(sql).toContain('p."publishedAt" <= CURRENT_TIMESTAMP')
    expect(sql).toContain('c."embeddingModel" = $2')
    expect(sql).toContain('c."embeddingDim" = $3')
    expect(sql).toContain('c."categoryId" = $4')
    expect(sql).toContain('c."tagIds"::jsonb @> $5::jsonb')
    expect(params).toEqual(['[0.25000000,0.50000000]', 'model-a', 768, 9, '[10]'])
  })

  it('keyword search escapes LIKE wildcards and offsets filter placeholders', async () => {
    await keywordSearchPostChunks('100%_match\\test', 'model-b', 1536, { tagId: 6 })

    const [sql, ...params] = prismaMock.$queryRawUnsafe.mock.calls[0]

    expect(sql).toContain('websearch_to_tsquery(\'simple\', $1)')
    expect(sql).toContain('c."title" ILIKE $4')
    expect(sql).toContain('c."tagIds"::jsonb @> $5::jsonb')
    expect(sql).toContain('p."status" = \'PUBLISHED\'')
    expect(sql).toContain('p."publishedAt" <= CURRENT_TIMESTAMP')
    expect(params).toEqual([
      '100%_match\\test',
      'model-b',
      1536,
      '%100\\%\\_match\\\\test%',
      '[6]'
    ])
  })
})

describe('raw SQL boundaries', () => {
  it('keeps unsafe Prisma raw SQL calls isolated in the RAG repository', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..')
    const serverDir = join(root, 'server')
    const files = listTypeScriptFiles(serverDir)
    const offenders = files
      .filter((file) => {
        const content = readFileSync(file, 'utf8')
        return content.includes('$queryRawUnsafe') || content.includes('$executeRawUnsafe')
      })
      .map((file) => relative(root, file))

    expect(offenders).toEqual(['server/services/rag/post-chunk.repository.ts'])
  })
})

function listTypeScriptFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    const stats = statSync(path)

    if (stats.isDirectory()) {
      return listTypeScriptFiles(path)
    }

    return path.endsWith('.ts') ? [path] : []
  })
}
