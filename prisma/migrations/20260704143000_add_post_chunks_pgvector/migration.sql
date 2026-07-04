CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE "PostChunkStatus" AS ENUM ('ACTIVE', 'STALE');

CREATE TABLE "PostChunk" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "headingPath" TEXT,
    "contentHash" TEXT NOT NULL,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "categoryId" INTEGER,
    "tagIds" TEXT NOT NULL DEFAULT '[]',
    "embeddingModel" TEXT NOT NULL,
    "embeddingDim" INTEGER NOT NULL,
    "embedding" vector(1536),
    "status" "PostChunkStatus" NOT NULL DEFAULT 'ACTIVE',
    "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostChunk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PostChunk_postId_chunkIndex_key" ON "PostChunk"("postId", "chunkIndex");

CREATE INDEX "PostChunk_postId_idx" ON "PostChunk"("postId");

CREATE INDEX "PostChunk_categoryId_idx" ON "PostChunk"("categoryId");

CREATE INDEX "PostChunk_contentHash_idx" ON "PostChunk"("contentHash");

CREATE INDEX "PostChunk_embeddingModel_idx" ON "PostChunk"("embeddingModel");

CREATE INDEX "PostChunk_status_idx" ON "PostChunk"("status");

CREATE INDEX "PostChunk_embedding_hnsw_idx" ON "PostChunk" USING hnsw ("embedding" vector_cosine_ops);

ALTER TABLE "PostChunk" ADD CONSTRAINT "PostChunk_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
