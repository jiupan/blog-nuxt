import { prisma } from '~~/server/utils/prisma'
import { chunkPost, type ChunkInputPost } from './chunker.service'
import { embedTexts, resolveEmbeddingConfig } from '~~/server/services/embeddings/embedding.service'
import { toVectorLiteral } from './vector-utils'

export type RebuildIndexResult = {
  indexedPosts: number
  chunks: number
  embeddingModel: string
  embeddingDim: number
}

export async function rebuildPublishedPostIndex(): Promise<RebuildIndexResult> {
  const posts = await prisma.post.findMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: { lte: new Date() }
    },
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

  await prisma.postChunk.deleteMany({ where: { postId: post.id } })

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

      await insertChunk(chunk, embedding, config.model, config.dimensions)
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
  const [chunkCount, staleCount, indexedPostRows, latestChunk, modelRows] = await Promise.all([
    prisma.postChunk.count(),
    prisma.postChunk.count({ where: { status: 'STALE' } }),
    prisma.postChunk.groupBy({ by: ['postId'], _count: { postId: true } }),
    prisma.postChunk.findFirst({ orderBy: { indexedAt: 'desc' }, select: { indexedAt: true } }),
    prisma.postChunk.groupBy({ by: ['embeddingModel', 'embeddingDim'], _count: { id: true } })
  ])

  return {
    indexedPosts: indexedPostRows.length,
    chunks: chunkCount,
    staleChunks: staleCount,
    lastIndexedAt: latestChunk?.indexedAt || null,
    models: modelRows.map((row) => ({
      model: row.embeddingModel,
      dimensions: row.embeddingDim,
      chunks: row._count.id
    }))
  }
}

async function insertChunk(chunk: Awaited<ReturnType<typeof chunkPost>>[number], embedding: number[], embeddingModel: string, embeddingDim: number) {
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
