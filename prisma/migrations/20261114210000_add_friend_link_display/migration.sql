CREATE TYPE "FriendLinkGroup" AS ENUM ('RECOMMENDED', 'LIFE', 'TECH');

ALTER TABLE "Bookmark"
  ADD COLUMN "friendGroup" "FriendLinkGroup" NOT NULL DEFAULT 'RECOMMENDED',
  ADD COLUMN "isSpotlight" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "avatar" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "cover" TEXT NOT NULL DEFAULT '';

ALTER TABLE "BookmarkPage"
  ADD COLUMN "applicationEmail" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "reportUrl" TEXT NOT NULL DEFAULT '';

UPDATE "BookmarkPage" SET "title" = '一起发现有趣的独立博客。', "intro" = ''
WHERE "id" = 1 AND "title" = '站外散步'
  AND "intro" = E'沿途捡到的文章、工具和小站。\n每一条都留一句为什么。';
