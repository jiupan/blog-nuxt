CREATE TYPE "KnowledgeDocumentStatus" AS ENUM ('PENDING', 'SYNCING', 'SYNCED', 'STALE', 'FAILED', 'DISABLED');
CREATE TYPE "KnowledgeSyncJobType" AS ENUM ('SINGLE_POST', 'BATCH_SYNC', 'FULL_REBUILD', 'REMOVE_STALE');
CREATE TYPE "KnowledgeSyncJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'PARTIAL_FAILED', 'FAILED');
CREATE TYPE "RagQueryStatus" AS ENUM ('SUCCESS', 'NO_KNOWLEDGE', 'FAILED');

CREATE TABLE "KnowledgeDocument" (
  "id" SERIAL NOT NULL,
  "postId" INTEGER NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "status" "KnowledgeDocumentStatus" NOT NULL DEFAULT 'PENDING',
  "sourceHash" TEXT NOT NULL,
  "indexedHash" TEXT,
  "chunkCount" INTEGER NOT NULL DEFAULT 0,
  "tokenCount" INTEGER NOT NULL DEFAULT 0,
  "embeddingModel" TEXT,
  "embeddingDim" INTEGER,
  "lastIndexedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KnowledgeSyncJob" (
  "id" SERIAL NOT NULL,
  "type" "KnowledgeSyncJobType" NOT NULL,
  "status" "KnowledgeSyncJobStatus" NOT NULL DEFAULT 'PENDING',
  "postId" INTEGER,
  "totalItems" INTEGER NOT NULL DEFAULT 0,
  "completedItems" INTEGER NOT NULL DEFAULT 0,
  "successItems" INTEGER NOT NULL DEFAULT 0,
  "failedItems" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KnowledgeSyncJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RagQueryLog" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER,
  "question" TEXT NOT NULL,
  "rewrittenQuestion" TEXT,
  "answer" TEXT,
  "status" "RagQueryStatus" NOT NULL,
  "retrievedChunks" JSONB,
  "citations" JSONB,
  "retrievalMs" INTEGER,
  "modelMs" INTEGER,
  "durationMs" INTEGER,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "feedback" INTEGER,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RagQueryLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KnowledgeDocument_postId_key" ON "KnowledgeDocument"("postId");
CREATE INDEX "KnowledgeDocument_enabled_status_idx" ON "KnowledgeDocument"("enabled", "status");
CREATE INDEX "KnowledgeDocument_lastIndexedAt_idx" ON "KnowledgeDocument"("lastIndexedAt");
CREATE INDEX "KnowledgeSyncJob_status_createdAt_idx" ON "KnowledgeSyncJob"("status", "createdAt");
CREATE INDEX "KnowledgeSyncJob_postId_createdAt_idx" ON "KnowledgeSyncJob"("postId", "createdAt");
CREATE INDEX "RagQueryLog_status_createdAt_idx" ON "RagQueryLog"("status", "createdAt");
CREATE INDEX "RagQueryLog_userId_createdAt_idx" ON "RagQueryLog"("userId", "createdAt");
ALTER TABLE "PostChunk" ALTER COLUMN "embedding" TYPE vector(1536) USING "embedding"::vector(1536);
CREATE INDEX IF NOT EXISTS "PostChunk_embedding_hnsw_idx" ON "PostChunk" USING hnsw ("embedding" vector_cosine_ops);

ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeSyncJob" ADD CONSTRAINT "KnowledgeSyncJob_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RagQueryLog" ADD CONSTRAINT "RagQueryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
