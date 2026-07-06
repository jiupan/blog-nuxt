import { prisma } from '../../utils/prisma'
import type { PreparedPostChunk } from './chunker.service'
import { toVectorLiteral } from './vector-utils'

export type RawChunkRow = {
  id: number
  postId: number
  chunkIndex: number
  title: string
  slug: string
  summary: string | null
  content: string
  headingPath: string | null
  distance?: number
}

export type ChunkSearchFilters = {
  categoryId?: number
  tagId?: number
}

export async function deletePostChunksByPostId(postId: number) {
  await prisma.postChunk.deleteMany({ where: { postId } })
}

export async function insertPostChunk(chunk: PreparedPostChunk, embedding: number[], embeddingModel: string, embeddingDim: number) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO "PostChunk" (
      "postId", "chunkIndex", "title", "slug", "summary", "content", "headingPath", "contentHash",
      "tokenCount", "categoryId", "tagIds", "embeddingModel", "embeddingDim", "embedding", "status",
      "indexedAt", "createdAt", "updatedAt"
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14::vector, 'ACTIVE',
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )`,
    chunk.postId,
    chunk.chunkIndex,
    chunk.title,
    chunk.slug,
    chunk.summary || null,
    chunk.content,
    chunk.headingPath || null,
    chunk.contentHash,
    chunk.tokenCount,
    chunk.categoryId || null,
    JSON.stringify(chunk.tagIds),
    embeddingModel,
    embeddingDim,
    toVectorLiteral(embedding)
  )
}

export async function getPostChunkIndexStats() {
  const [chunkCount, staleCount, indexedPostRows, latestChunk, modelRows] = await Promise.all([
    prisma.postChunk.count(),
    prisma.postChunk.count({ where: { status: 'STALE' } }),
    prisma.postChunk.groupBy({ by: ['postId'], _count: { postId: true } }),
    prisma.postChunk.findFirst({ orderBy: { indexedAt: 'desc' }, select: { indexedAt: true } }),
    prisma.postChunk.groupBy({ by: ['embeddingModel', 'embeddingDim'], _count: { id: true } })
  ])

  return {
    chunkCount,
    staleCount,
    indexedPostCount: indexedPostRows.length,
    lastIndexedAt: latestChunk?.indexedAt || null,
    models: modelRows.map((row) => ({
      model: row.embeddingModel,
      dimensions: row.embeddingDim,
      chunks: row._count.id
    }))
  }
}

export async function vectorSearchPostChunks(
  embedding: number[],
  embeddingModel: string,
  embeddingDim: number,
  filters: ChunkSearchFilters
) {
  const rawFilters = buildRawFilters(filters, 4)
  return prisma.$queryRawUnsafe<RawChunkRow[]>(
    `SELECT
      c."id",
      c."postId",
      c."chunkIndex",
      c."title",
      c."slug",
      c."summary",
      c."content",
      c."headingPath",
      c."embedding" <=> $1::vector AS "distance"
    FROM "PostChunk" c
    JOIN "Post" p ON p."id" = c."postId"
    WHERE c."status" = 'ACTIVE'
      AND p."status" = 'PUBLISHED'
      AND p."publishedAt" <= CURRENT_TIMESTAMP
      AND c."embeddingModel" = $2
      AND c."embeddingDim" = $3
      ${rawFilters.sql}
    ORDER BY c."embedding" <=> $1::vector
    LIMIT 40`,
    toVectorLiteral(embedding),
    embeddingModel,
    embeddingDim,
    ...rawFilters.params
  )
}

export async function keywordSearchPostChunks(
  query: string,
  embeddingModel: string,
  embeddingDim: number,
  filters: ChunkSearchFilters
) {
  const rawFilters = buildRawFilters(filters, 5)
  return prisma.$queryRawUnsafe<RawChunkRow[]>(
    `SELECT
      c."id",
      c."postId",
      c."chunkIndex",
      c."title",
      c."slug",
      c."summary",
      c."content",
      c."headingPath"
    FROM "PostChunk" c
    JOIN "Post" p ON p."id" = c."postId"
    WHERE c."status" = 'ACTIVE'
      AND p."status" = 'PUBLISHED'
      AND p."publishedAt" <= CURRENT_TIMESTAMP
      AND c."embeddingModel" = $2
      AND c."embeddingDim" = $3
      AND (
        to_tsvector('simple', concat_ws(' ', c."title", c."summary", c."content")) @@ websearch_to_tsquery('simple', $1)
        OR c."title" ILIKE $4
        OR c."content" ILIKE $4
        OR c."summary" ILIKE $4
      )
      ${rawFilters.sql}
    ORDER BY
      CASE WHEN c."title" ILIKE $4 THEN 0 ELSE 1 END,
      c."indexedAt" DESC
    LIMIT 40`,
    query,
    embeddingModel,
    embeddingDim,
    `%${escapeLike(query)}%`,
    ...rawFilters.params
  )
}

function buildRawFilters(options: ChunkSearchFilters, startIndex = 2) {
  const parts: string[] = []
  const params: unknown[] = []
  let index = startIndex

  if (options.categoryId) {
    parts.push(`AND c."categoryId" = $${index}`)
    params.push(options.categoryId)
    index += 1
  }

  if (options.tagId) {
    parts.push(`AND c."tagIds"::jsonb @> $${index}::jsonb`)
    params.push(JSON.stringify([options.tagId]))
  }

  return {
    sql: parts.length ? parts.join('\n') : '',
    params
  }
}

function escapeLike(value: string) {
  return value.replace(/[%_\\]/g, '\\$&')
}
