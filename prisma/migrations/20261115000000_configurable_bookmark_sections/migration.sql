BEGIN;

CREATE TABLE "BookmarkSection" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sort" INTEGER NOT NULL,

    CONSTRAINT "BookmarkSection_pkey" PRIMARY KEY ("id")
);

INSERT INTO "BookmarkSection" ("name", "description", "sort") VALUES
    ('博客与网站', '持续更新的独立博客和有特色的网站。', 0),
    ('在线工具', '可以直接用的工具和服务。', 1),
    ('技术', '技术文档、开源项目和学习资源。', 2),
    ('生活', '关于日常、兴趣和生活见闻的网站。', 3),
    ('文章', '读过后想留存的文章。', 4);

ALTER TABLE "Bookmark" ADD COLUMN "sectionId" INTEGER;

UPDATE "Bookmark" AS bookmark
SET "sectionId" = section."id"
FROM "BookmarkSection" AS section
WHERE section."sort" = CASE
    WHEN bookmark."category" = 'TOOL' THEN 1
    WHEN bookmark."category" = 'ARTICLE' THEN 4
    WHEN bookmark."friendGroup" = 'TECH' THEN 2
    WHEN bookmark."friendGroup" = 'LIFE' THEN 3
    ELSE 0
END;

ALTER TABLE "Bookmark" ALTER COLUMN "sectionId" SET NOT NULL,
    DROP COLUMN "category", DROP COLUMN "friendGroup";
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_sectionId_fkey"
    FOREIGN KEY ("sectionId") REFERENCES "BookmarkSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Bookmark_sectionId_idx" ON "Bookmark"("sectionId");

DROP TYPE "BookmarkCategory";
DROP TYPE "FriendLinkGroup";

COMMIT;
