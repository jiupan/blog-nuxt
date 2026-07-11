CREATE TYPE "ArticleChatStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "ArticleChatRole" AS ENUM ('USER', 'ASSISTANT');
CREATE TYPE "ArticleChatMessageStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

CREATE TABLE "ArticleChatConversation" (
  "id" SERIAL NOT NULL,
  "postId" INTEGER NOT NULL,
  "userId" INTEGER,
  "anonymousKeyHash" TEXT,
  "status" "ArticleChatStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ArticleChatConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArticleChatMessage" (
  "id" SERIAL NOT NULL,
  "conversationId" INTEGER NOT NULL,
  "role" "ArticleChatRole" NOT NULL,
  "content" TEXT NOT NULL,
  "status" "ArticleChatMessageStatus" NOT NULL DEFAULT 'COMPLETED',
  "citations" JSONB,
  "durationMs" INTEGER,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArticleChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArticleChatConversation_postId_userId_lastMessageAt_idx" ON "ArticleChatConversation"("postId", "userId", "lastMessageAt");
CREATE INDEX "ArticleChatConversation_postId_anonymousKeyHash_lastMessageAt_idx" ON "ArticleChatConversation"("postId", "anonymousKeyHash", "lastMessageAt");
CREATE INDEX "ArticleChatMessage_conversationId_createdAt_idx" ON "ArticleChatMessage"("conversationId", "createdAt");
ALTER TABLE "ArticleChatConversation" ADD CONSTRAINT "ArticleChatConversation_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArticleChatConversation" ADD CONSTRAINT "ArticleChatConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArticleChatMessage" ADD CONSTRAINT "ArticleChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ArticleChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
