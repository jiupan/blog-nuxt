ALTER TABLE "Post" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Post" ADD COLUMN "pinnedAt" TIMESTAMP(3);

CREATE INDEX "Post_isPinned_pinnedAt_idx" ON "Post"("isPinned", "pinnedAt");
