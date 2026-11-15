ALTER TABLE "User" ADD COLUMN "pendingEmail" TEXT, ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

CREATE TABLE "AccountSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "AccountSession_userId_idx" ON "AccountSession"("userId");
CREATE INDEX "AccountSession_expiresAt_idx" ON "AccountSession"("expiresAt");

CREATE TABLE "AccountEmailToken" (
    "tokenHash" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "purpose" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "AccountEmailToken_userId_purpose_key" ON "AccountEmailToken"("userId", "purpose");
CREATE INDEX "AccountEmailToken_expiresAt_idx" ON "AccountEmailToken"("expiresAt");

ALTER TYPE "AiUsageStatus" ADD VALUE 'PENDING' BEFORE 'SUCCESS';
ALTER TABLE "AiUsageLog" ALTER COLUMN "userId" DROP NOT NULL, ADD COLUMN "guestKey" TEXT;
CREATE INDEX "AiUsageLog_guestKey_createdAt_idx" ON "AiUsageLog"("guestKey", "createdAt");

-- Preserve existing article usage when switching to the durable ledger.
INSERT INTO "AiUsageLog" ("userId", "guestKey", "feature", "status", "createdAt")
SELECT conversation."userId", conversation."anonymousKeyHash", 'article-chat',
    CASE WHEN EXISTS (
        SELECT 1 FROM "ArticleChatMessage" AS answer
        WHERE answer."conversationId" = message."conversationId"
          AND answer."role" = 'ASSISTANT' AND answer."status" = 'COMPLETED' AND answer."id" > message."id"
          AND NOT EXISTS (
              SELECT 1 FROM "ArticleChatMessage" AS next_message
              WHERE next_message."conversationId" = message."conversationId" AND next_message."role" = 'USER'
                AND next_message."id" > message."id" AND next_message."id" < answer."id"
          )
    ) THEN 'SUCCESS'::"AiUsageStatus" ELSE 'FAILED'::"AiUsageStatus" END,
    message."createdAt"
FROM "ArticleChatMessage" AS message
JOIN "ArticleChatConversation" AS conversation ON message."conversationId" = conversation."id"
WHERE message."role" = 'USER'
  AND (conversation."userId" IS NOT NULL OR conversation."anonymousKeyHash" IS NOT NULL);
