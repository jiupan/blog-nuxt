ALTER TABLE "KnowledgeSyncJob"
ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "activeKey" TEXT,
ADD COLUMN "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "lockedAt" TIMESTAMP(3),
ADD COLUMN "heartbeatAt" TIMESTAMP(3),
ADD COLUMN "lockedBy" TEXT;

DROP INDEX IF EXISTS "KnowledgeSyncJob_status_createdAt_idx";

CREATE INDEX "KnowledgeSyncJob_status_nextRunAt_createdAt_idx"
ON "KnowledgeSyncJob"("status", "nextRunAt", "createdAt");

CREATE INDEX "KnowledgeSyncJob_status_heartbeatAt_idx"
ON "KnowledgeSyncJob"("status", "heartbeatAt");

CREATE UNIQUE INDEX "KnowledgeSyncJob_activeKey_key"
ON "KnowledgeSyncJob"("activeKey");

-- Jobs left RUNNING by a previous process become immediately recoverable.
UPDATE "KnowledgeSyncJob"
SET
  "status" = 'PENDING',
  "nextRunAt" = CURRENT_TIMESTAMP,
  "lockedAt" = NULL,
  "heartbeatAt" = NULL,
  "lockedBy" = NULL,
  "activeKey" = NULL
WHERE "status" = 'RUNNING';
