import { embedText } from '~~/server/services/embeddings/embedding.service'
import { rerankSearchResults } from './reranker.service'
import { keywordSearchPostChunks, type RawChunkRow, vectorSearchPostChunks } from './post-chunk.repository'

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

export async function searchPostChunks(options: RagSearchOptions): Promise<RagSearchResult[]> {
  const query = options.query.trim()
  if (!query) return []

  const { config, embedding } = await embedText(buildQueryEmbeddingText(query))
  if (!embedding) return []

  const [vectorRows, keywordRows] = await Promise.all([
    vectorSearchPostChunks(embedding, config.model, config.dimensions, options),
    keywordSearchPostChunks(query, config.model, config.dimensions, options)
  ])
  const fused = fuseResults(vectorRows, keywordRows)
  const reranked = await rerankSearchResults(query, fused)

  return reranked.slice(0, options.limit || 10)
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
