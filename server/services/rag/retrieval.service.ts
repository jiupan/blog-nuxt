import { prisma } from '~~/server/utils/prisma'
import { embedText } from '~~/server/services/embeddings/embedding.service'
import { toVectorLiteral } from './vector-utils'

export type RagSearchOptions = {
  query: string
  categoryId?: number
  tagId?: number
  limit?: number
}

export type RagSearchResult = {
  chunkId: number
  postId: number
  chunkIndex: number
  title: string
  slug: string
  summary?: string | null
  excerpt: string
  headingPath?: string | null
  vectorRank?: number
  keywordRank?: number
  score: number
}

type RawChunkRow = {
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

export async function searchPostChunks(options: RagSearchOptions): Promise<RagSearchResult[]> {
  const query = options.query.trim()
  if (!query) return []

  const [{ embedding }, keywordRows] = await Promise.all([
    embedText(buildQueryEmbeddingText(query)),
    keywordSearch(query, options)
  ])
  if (!embedding) return []

  const vectorRows = await vectorSearch(embedding, options)
  const fused = fuseResults(vectorRows, keywordRows)

  return fused.slice(0, options.limit || 10)
}

async function vectorSearch(embedding: number[], options: RagSearchOptions) {
  const filters = buildRawFilters(options)
  const rows = await prisma.$queryRawUnsafe<RawChunkRow[]>(
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
      ${filters.sql}
    ORDER BY c."embedding" <=> $1::vector
    LIMIT 40`,
    toVectorLiteral(embedding),
    ...filters.params
  )

  return rows
}

async function keywordSearch(query: string, options: RagSearchOptions) {
  const filters = buildRawFilters(options, 2)
  const rows = await prisma.$queryRawUnsafe<RawChunkRow[]>(
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
      AND (c."title" ILIKE $1 OR c."content" ILIKE $1 OR c."summary" ILIKE $1)
      ${filters.sql}
    ORDER BY
      CASE WHEN c."title" ILIKE $1 THEN 0 ELSE 1 END,
      c."indexedAt" DESC
    LIMIT 40`,
    `%${escapeLike(query)}%`,
    ...filters.params
  )

  return rows
}

function fuseResults(vectorRows: RawChunkRow[], keywordRows: RawChunkRow[]) {
  const map = new Map<number, RagSearchResult>()
  const rrfK = 60

  vectorRows.forEach((row, index) => {
    const rank = index + 1
    map.set(row.id, {
      chunkId: row.id,
      postId: row.postId,
      chunkIndex: row.chunkIndex,
      title: row.title,
      slug: row.slug,
      summary: row.summary,
      excerpt: row.content,
      headingPath: row.headingPath,
      vectorRank: rank,
      score: 1 / (rrfK + rank)
    })
  })

  keywordRows.forEach((row, index) => {
    const rank = index + 1
    const current = map.get(row.id)

    if (current) {
      current.keywordRank = rank
      current.score += 1 / (rrfK + rank)
    } else {
      map.set(row.id, {
        chunkId: row.id,
        postId: row.postId,
        chunkIndex: row.chunkIndex,
        title: row.title,
        slug: row.slug,
        summary: row.summary,
        excerpt: row.content,
        headingPath: row.headingPath,
        keywordRank: rank,
        score: 1 / (rrfK + rank)
      })
    }
  })

  return [...map.values()].sort((a, b) => b.score - a.score)
}

function buildQueryEmbeddingText(query: string) {
  return `检索问题：${query}`
}

function buildRawFilters(options: RagSearchOptions, startIndex = 2) {
  const parts: string[] = []
  const params: unknown[] = []
  let index = startIndex

  if (options.categoryId) {
    parts.push(`AND c."categoryId" = $${index}`)
    params.push(options.categoryId)
    index += 1
  }

  if (options.tagId) {
    parts.push(`AND c."tagIds" LIKE $${index}`)
    params.push(`%${options.tagId}%`)
  }

  return {
    sql: parts.length ? parts.join('\n') : '',
    params
  }
}

function escapeLike(value: string) {
  return value.replace(/[%_\\]/g, '\\$&')
}
