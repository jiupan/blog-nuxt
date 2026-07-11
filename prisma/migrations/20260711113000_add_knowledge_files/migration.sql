ALTER TYPE "KnowledgeSyncJobType" ADD VALUE 'FILE_SYNC';

CREATE TABLE "KnowledgeFile" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "storedName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "extension" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "fileHash" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "status" "KnowledgeDocumentStatus" NOT NULL DEFAULT 'PENDING',
  "chunkCount" INTEGER NOT NULL DEFAULT 0,
  "tokenCount" INTEGER NOT NULL DEFAULT 0,
  "embeddingModel" TEXT,
  "embeddingDim" INTEGER,
  "lastIndexedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KnowledgeFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KnowledgeFileChunk" (
  "id" SERIAL NOT NULL,
  "knowledgeFileId" INTEGER NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "headingPath" TEXT,
  "pageNumber" INTEGER,
  "contentHash" TEXT NOT NULL,
  "tokenCount" INTEGER NOT NULL DEFAULT 0,
  "embeddingModel" TEXT NOT NULL,
  "embeddingDim" INTEGER NOT NULL,
  "embedding" vector(1536),
  "status" "PostChunkStatus" NOT NULL DEFAULT 'ACTIVE',
  "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KnowledgeFileChunk_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "KnowledgeSyncJob" ADD COLUMN "knowledgeFileId" INTEGER;
CREATE UNIQUE INDEX "KnowledgeFile_storedName_key" ON "KnowledgeFile"("storedName");
CREATE INDEX "KnowledgeFile_enabled_status_idx" ON "KnowledgeFile"("enabled", "status");
CREATE INDEX "KnowledgeFile_fileHash_idx" ON "KnowledgeFile"("fileHash");
CREATE INDEX "KnowledgeFile_createdAt_idx" ON "KnowledgeFile"("createdAt");
CREATE UNIQUE INDEX "KnowledgeFileChunk_knowledgeFileId_chunkIndex_key" ON "KnowledgeFileChunk"("knowledgeFileId", "chunkIndex");
CREATE INDEX "KnowledgeFileChunk_knowledgeFileId_idx" ON "KnowledgeFileChunk"("knowledgeFileId");
CREATE INDEX "KnowledgeFileChunk_contentHash_idx" ON "KnowledgeFileChunk"("contentHash");
CREATE INDEX "KnowledgeFileChunk_embeddingModel_idx" ON "KnowledgeFileChunk"("embeddingModel");
CREATE INDEX "KnowledgeFileChunk_status_idx" ON "KnowledgeFileChunk"("status");
CREATE INDEX "KnowledgeSyncJob_knowledgeFileId_createdAt_idx" ON "KnowledgeSyncJob"("knowledgeFileId", "createdAt");
CREATE INDEX "KnowledgeFileChunk_embedding_hnsw_idx" ON "KnowledgeFileChunk" USING hnsw ("embedding" vector_cosine_ops);
ALTER TABLE "KnowledgeFileChunk" ADD CONSTRAINT "KnowledgeFileChunk_knowledgeFileId_fkey" FOREIGN KEY ("knowledgeFileId") REFERENCES "KnowledgeFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeSyncJob" ADD CONSTRAINT "KnowledgeSyncJob_knowledgeFileId_fkey" FOREIGN KEY ("knowledgeFileId") REFERENCES "KnowledgeFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
