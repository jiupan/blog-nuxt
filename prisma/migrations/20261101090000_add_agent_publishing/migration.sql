CREATE TYPE "AgentPublicationStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

CREATE TABLE "AgentApiKey" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "createdById" INTEGER,
  "revokedAt" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentApiKey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentPublication" (
  "id" SERIAL NOT NULL,
  "keyId" INTEGER NOT NULL,
  "requestId" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "requestedStatus" "PostStatus" NOT NULL,
  "sources" JSONB NOT NULL,
  "status" "AgentPublicationStatus" NOT NULL DEFAULT 'PENDING',
  "error" TEXT,
  "postId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentPublication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentApiKey_tokenHash_key" ON "AgentApiKey"("tokenHash");
CREATE INDEX "AgentApiKey_createdAt_idx" ON "AgentApiKey"("createdAt");
CREATE UNIQUE INDEX "AgentPublication_postId_key" ON "AgentPublication"("postId");
CREATE UNIQUE INDEX "AgentPublication_keyId_requestId_key" ON "AgentPublication"("keyId", "requestId");
CREATE INDEX "AgentPublication_createdAt_id_idx" ON "AgentPublication"("createdAt", "id");
ALTER TABLE "AgentApiKey" ADD CONSTRAINT "AgentApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentPublication" ADD CONSTRAINT "AgentPublication_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "AgentApiKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgentPublication" ADD CONSTRAINT "AgentPublication_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
