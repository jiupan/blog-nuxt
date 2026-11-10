CREATE TYPE "BookmarkCategory" AS ENUM ('ARTICLE', 'TOOL', 'SITE');
CREATE TYPE "BookmarkStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN');

CREATE TABLE "Bookmark" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "category" "BookmarkCategory" NOT NULL,
    "note" TEXT NOT NULL,
    "status" "BookmarkStatus" NOT NULL DEFAULT 'DRAFT',
    "sort" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3),
    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Bookmark_url_key" ON "Bookmark"("url");
CREATE INDEX "Bookmark_sort_id_idx" ON "Bookmark"("sort", "id");

CREATE TABLE "BookmarkPage" (
    "id" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "intro" TEXT NOT NULL,
    "showRandom" BOOLEAN NOT NULL DEFAULT true,
    "featuredId" INTEGER,
    CONSTRAINT "BookmarkPage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BookmarkPage_featuredId_fkey" FOREIGN KEY ("featuredId") REFERENCES "Bookmark"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "BookmarkPage" ("id", "title", "intro")
VALUES (1, '站外散步', E'沿途捡到的文章、工具和小站。\n每一条都留一句为什么。');

UPDATE "MenuItem" SET "title" = '书签'
WHERE "url" IN ('/link', '/link/') AND "title" = '友链';
