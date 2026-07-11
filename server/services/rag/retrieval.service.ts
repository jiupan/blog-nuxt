import { embedText } from '~~/server/services/embeddings/embedding.service'
import { rerankSearchResults } from './reranker.service'
import {
  keywordSearchKnowledgeFileChunks,
  keywordSearchPostChunks,
  type RawChunkRow,
  type RawFileChunkRow,
  vectorSearchKnowledgeFileChunks,
  vectorSearchPostChunks
} from './post-chunk.repository'

export type RagSearchOptions = {
  query: string
  postId?: number
  categoryId?: number
  tagId?: number
  limit?: number
}

export type RagSearchResult = {
  chunkId: number
  sourceType: 'POST' | 'FILE'
  postId?: number
  knowledgeFileId?: number
  chunkIndex: number
  title: string
  slug: string
  summary?: string | null
  excerpt: string
  headingPath?: string | null
  pageNumber?: number | null
  vectorRank?: number
  keywordRank?: number
  score: number
}

export async function searchPostChunks(options: RagSearchOptions): Promise<RagSearchResult[]> {
  const query = options.query.trim()
  if (!query) return []

  const { config, embedding } = await embedText(buildQueryEmbeddingText(query))
  if (!embedding) return []

  const [vectorRows, keywordRows, fileVectorRows, fileKeywordRows] = await Promise.all([
    vectorSearchPostChunks(embedding, config.model, config.dimensions, options),
    keywordSearchPostChunks(query, config.model, config.dimensions, options),
    options.postId ? Promise.resolve([]) : vectorSearchKnowledgeFileChunks(embedding, config.model, config.dimensions),
    options.postId ? Promise.resolve([]) : keywordSearchKnowledgeFileChunks(query, config.model, config.dimensions)
  ])
  const fused = fuseResults(vectorRows, keywordRows, fileVectorRows, fileKeywordRows)
  const reranked = await rerankSearchResults(query, fused)

  return reranked.slice(0, options.limit || 10)
}

function fuseResults(vectorRows: RawChunkRow[], keywordRows: RawChunkRow[], fileVectorRows: RawFileChunkRow[], fileKeywordRows: RawFileChunkRow[]) {
  const map = new Map<string, RagSearchResult>()
  const rrfK = 60

  vectorRows.forEach((row, index) => {
    const rank = index + 1
    map.set(`post:${row.id}`, {
      chunkId: row.id,
      sourceType: 'POST',
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
    const current = map.get(`post:${row.id}`)

    if (current) {
      current.keywordRank = rank
      current.score += 1 / (rrfK + rank)
    } else {
      map.set(`post:${row.id}`, {
        chunkId: row.id,
        sourceType: 'POST',
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

  fileVectorRows.forEach((row, index) => addFileRow(row, index + 1, 'vector'))
  fileKeywordRows.forEach((row, index) => addFileRow(row, index + 1, 'keyword'))

  return [...map.values()].sort((a, b) => b.score - a.score)

  function addFileRow(row: RawFileChunkRow, rank: number, kind: 'vector' | 'keyword') {
    const key = `file:${row.id}`
    const current = map.get(key)
    if (current) {
      if (kind === 'vector') current.vectorRank = rank
      else current.keywordRank = rank
      current.score += 1 / (rrfK + rank)
      return
    }
    map.set(key, {
      chunkId: row.id,
      sourceType: 'FILE',
      knowledgeFileId: row.knowledgeFileId,
      chunkIndex: row.chunkIndex,
      title: row.title,
      slug: '',
      excerpt: row.content,
      headingPath: row.headingPath,
      pageNumber: row.pageNumber,
      ...(kind === 'vector' ? { vectorRank: rank } : { keywordRank: rank }),
      score: 1 / (rrfK + rank)
    })
  }
}

function buildQueryEmbeddingText(query: string) {
  return `检索问题：${query}`
}
