import { prisma } from '~~/server/utils/prisma'
import { chunkPost, type ChunkInputPost } from './chunker.service'
import { embedTexts, resolveEmbeddingConfig } from '~~/server/services/embeddings/embedding.service'
import { buildPublishedPostWhere } from '~~/server/services/posts/post-query.service'
import { deletePostChunksByPostId, getPostChunkIndexStats, insertPostChunk } from './post-chunk.repository'

export type RebuildIndexResult = {
  indexedPosts: number
  chunks: number
  embeddingModel: string
  embeddingDim: number
}

export async function rebuildPublishedPostIndex(): Promise<RebuildIndexResult> {
  const posts = await prisma.post.findMany({
    where: buildPublishedPostWhere(),
    include: {
      category: true,
      tags: { include: { tag: true } }
    },
    orderBy: [
      { publishedAt: 'desc' },
      { id: 'desc' }
    ]
  })
  let chunks = 0
  let embeddingModel = ''
  let embeddingDim = 1536

  for (const post of posts) {
    const result = await indexPost(post)
    chunks += result.chunks
    embeddingModel = result.embeddingModel
    embeddingDim = result.embeddingDim
  }

  return {
    indexedPosts: posts.length,
    chunks,
    embeddingModel,
    embeddingDim
  }
}

export async function indexPost(post: ChunkInputPost): Promise<RebuildIndexResult> {
  const chunks = chunkPost(post)
  const embeddingConfig = await resolveEmbeddingConfig()

  await deletePostChunksByPostId(post.id)

  if (!chunks.length) {
    return {
      indexedPosts: 1,
      chunks: 0,
      embeddingModel: embeddingConfig.model,
      embeddingDim: embeddingConfig.dimensions
    }
  }

  const batchSize = 24
  for (let offset = 0; offset < chunks.length; offset += batchSize) {
    const batch = chunks.slice(offset, offset + batchSize)
    const { config, embeddings } = await embedTexts(batch.map((chunk) => chunk.embeddingText))

    for (let index = 0; index < batch.length; index += 1) {
      const chunk = batch[index]
      const embedding = embeddings[index]
      if (!chunk || !embedding) continue

      await insertPostChunk(chunk, embedding, config.model, config.dimensions)
    }
  }

  return {
    indexedPosts: 1,
    chunks: chunks.length,
    embeddingModel: embeddingConfig.model,
    embeddingDim: embeddingConfig.dimensions
  }
}

export async function getIndexStatus() {
  const stats = await getPostChunkIndexStats()

  return {
    indexedPosts: stats.indexedPostCount,
    chunks: stats.chunkCount,
    staleChunks: stats.staleCount,
    lastIndexedAt: stats.lastIndexedAt,
    models: stats.models
  }
}
