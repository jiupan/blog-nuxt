-- 原生评论系统：评论表、限流桶、评论审核审计字段。
-- Prisma schema 表达不了 CHECK 约束，因此下方六条约束只能手写迁移。
-- 迁移执行顺序刻意放在建表之后、外键之前，便于逐条定位失败原因。
--
-- 注意：生产与 CI 一律用 `prisma migrate deploy` 应用迁移。
-- 本地如果用 `prisma migrate dev`，它会拿 shadow 库对比，发现这六条 CHECK 约束属于漂移，
-- 于是生成一条把约束删掉的迁移。删掉只是少了一层数据库侧的兜底，不会破坏既有数据；
-- 要保留就把生成迁移里的 DROP CONSTRAINT 语句去掉，再手动补回下面这六条。

CREATE TYPE "CommentAuthorKind" AS ENUM ('ACCOUNT', 'GUEST', 'LEGACY');
CREATE TYPE "CommentStatus" AS ENUM ('PENDING', 'VISIBLE', 'HIDDEN', 'DELETED');
CREATE TYPE "CommentBodyFormat" AS ENUM ('MARKDOWN', 'LEGACY_HTML');
CREATE TYPE "CommentRateScope" AS ENUM ('ACCOUNT', 'GUEST', 'IP');
CREATE TYPE "CommentRateWindow" AS ENUM ('MINUTE', 'TEN_MINUTES', 'HOUR');

CREATE TABLE "Comment" (
  "id" SERIAL NOT NULL,
  "postId" INTEGER NOT NULL,
  "threadRootId" INTEGER,
  "replyToId" INTEGER,
  "authorKind" "CommentAuthorKind" NOT NULL,
  "authorUserId" INTEGER,
  "guestTokenHash" TEXT,
  "authorName" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "bodyFormat" "CommentBodyFormat" NOT NULL DEFAULT 'MARKDOWN',
  "status" "CommentStatus" NOT NULL DEFAULT 'PENDING',
  "legacySource" TEXT,
  "legacyId" TEXT,
  "requestId" TEXT,
  "requestFingerprint" TEXT,
  "legacyLikeCount" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommentRateBucket" (
  "id" SERIAL NOT NULL,
  "scope" "CommentRateScope" NOT NULL,
  "keyHash" TEXT NOT NULL,
  "windowKind" "CommentRateWindow" NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommentRateBucket_pkey" PRIMARY KEY ("id")
);

-- 审计目标字段。刻意不建外键：评论会随文章硬删除被级联清理，审计记录必须比目标活得久。
ALTER TABLE "AdminAuditLog" ADD COLUMN "commentId" INTEGER;
ALTER TABLE "AdminAuditLog" ADD COLUMN "postId" INTEGER;

CREATE UNIQUE INDEX "Comment_postId_requestId_key" ON "Comment"("postId", "requestId");
CREATE UNIQUE INDEX "Comment_legacySource_legacyId_key" ON "Comment"("legacySource", "legacyId");
CREATE INDEX "Comment_postId_status_createdAt_id_idx" ON "Comment"("postId", "status", "createdAt", "id");
CREATE INDEX "Comment_postId_threadRootId_status_createdAt_id_idx" ON "Comment"("postId", "threadRootId", "status", "createdAt", "id");
CREATE INDEX "Comment_threadRootId_status_createdAt_id_idx" ON "Comment"("threadRootId", "status", "createdAt", "id");
CREATE INDEX "Comment_status_createdAt_id_idx" ON "Comment"("status", "createdAt", "id");
CREATE INDEX "Comment_authorUserId_status_createdAt_idx" ON "Comment"("authorUserId", "status", "createdAt");
CREATE UNIQUE INDEX "CommentRateBucket_scope_keyHash_windowStart_windowKind_key" ON "CommentRateBucket"("scope", "keyHash", "windowStart", "windowKind");
CREATE INDEX "CommentRateBucket_expiresAt_idx" ON "CommentRateBucket"("expiresAt");
CREATE INDEX "AdminAuditLog_commentId_createdAt_idx" ON "AdminAuditLog"("commentId", "createdAt");
CREATE INDEX "AdminAuditLog_postId_createdAt_idx" ON "AdminAuditLog"("postId", "createdAt");

-- ── 手写 CHECK 约束 ────────────────────────────────────────────────

-- 主评论的 threadRootId 与 replyToId 同时为空；回复同时非空。
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_thread_pair_check" CHECK (
  ("threadRootId" IS NULL AND "replyToId" IS NULL)
  OR ("threadRootId" IS NOT NULL AND "replyToId" IS NOT NULL)
);

-- 禁止指向自身。
-- 注意：直接回复主评论时 threadRootId = replyToId = 主评论 id，这是合法形态，
-- 因此只能与本行 id 比较，不能比较 threadRootId 与 replyToId。
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_not_self_check" CHECK (
  "threadRootId" IS DISTINCT FROM "id" AND "replyToId" IS DISTINCT FROM "id"
);

-- 身份与凭证成对。
--   GUEST   必须有凭证摘要，且不关联账户（登录用户选访客身份也记为 GUEST）。
--   ACCOUNT 不允许有凭证摘要；authorUserId 允许为 NULL —— 账户被删除后外键 SET NULL
--           会置空该列，此时仅失去自助删除能力，展示名快照仍保留。
--   LEGACY  两者都为空，保留原展示名，不关联任何现有账户。
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_author_identity_check" CHECK (
  ("authorKind" = 'GUEST' AND "authorUserId" IS NULL AND "guestTokenHash" IS NOT NULL)
  OR ("authorKind" = 'ACCOUNT' AND "guestTokenHash" IS NULL)
  OR ("authorKind" = 'LEGACY' AND "authorUserId" IS NULL AND "guestTokenHash" IS NULL)
);

-- 导入字段成对。
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_legacy_pair_check" CHECK (
  ("legacySource" IS NULL) = ("legacyId" IS NULL)
);

-- 幂等字段成对。
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_request_pair_check" CHECK (
  ("requestId" IS NULL) = ("requestFingerprint" IS NULL)
);

-- 来源互斥：一条评论恰好来自原生写入或离线导入之一。
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_origin_check" CHECK (
  ("legacySource" IS NOT NULL AND "requestId" IS NULL)
  OR ("legacySource" IS NULL AND "requestId" IS NOT NULL)
);

ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_threadRootId_fkey" FOREIGN KEY ("threadRootId") REFERENCES "Comment"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Comment"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
