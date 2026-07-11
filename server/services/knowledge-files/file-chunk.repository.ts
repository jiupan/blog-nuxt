import { Prisma } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { toVectorLiteral } from '../rag/vector-utils'
import type { PreparedFileChunk } from './file-chunker.service'

export async function replaceKnowledgeFileChunks(
  knowledgeFileId: number,
  title: string,
  chunks: PreparedFileChunk[],
  embeddings: number[][],
  embeddingModel: string,
  embeddingDim: number
) {
  await prisma.$transaction(async (tx) => {
    await tx.knowledgeFileChunk.deleteMany({ where: { knowledgeFileId } })
    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index]
      const embedding = embeddings[index]
      if (!chunk || !embedding) throw new Error('文件分块与向量数量不一致')
      await tx.$executeRaw`
        INSERT INTO "KnowledgeFileChunk" (
          "knowledgeFileId", "chunkIndex", "title", "content", "headingPath", "pageNumber",
          "contentHash", "tokenCount", "embeddingModel", "embeddingDim", "embedding", "status",
          "indexedAt", "createdAt", "updatedAt"
        ) VALUES (
          ${knowledgeFileId}, ${chunk.chunkIndex}, ${title}, ${chunk.content}, ${chunk.headingPath || null},
          ${chunk.pageNumber || null}, ${chunk.contentHash}, ${chunk.tokenCount}, ${embeddingModel}, ${embeddingDim},
          ${Prisma.raw(`'${toVectorLiteral(embedding)}'::vector`)}, 'ACTIVE',
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `
    }
  })
}
