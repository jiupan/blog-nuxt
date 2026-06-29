CREATE TYPE "MenuLocation" AS ENUM ('PRIMARY', 'FOOTER', 'MOBILE', 'CUSTOM');

CREATE TYPE "MenuItemType" AS ENUM ('CUSTOM', 'POST', 'CATEGORY', 'TAG', 'PAGE', 'ARCHIVE', 'HOME');

CREATE TABLE "Menu" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "location" "MenuLocation" NOT NULL DEFAULT 'CUSTOM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MenuItem" (
    "id" SERIAL NOT NULL,
    "menuId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "type" "MenuItemType" NOT NULL DEFAULT 'CUSTOM',
    "targetId" INTEGER,
    "targetSlug" TEXT,
    "targetBlank" BOOLEAN NOT NULL DEFAULT false,
    "badge" TEXT,
    "icon" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Menu_slug_key" ON "Menu"("slug");
CREATE INDEX "Menu_location_idx" ON "Menu"("location");
CREATE INDEX "Menu_isActive_idx" ON "Menu"("isActive");
CREATE INDEX "MenuItem_menuId_sort_idx" ON "MenuItem"("menuId", "sort");
CREATE INDEX "MenuItem_parentId_idx" ON "MenuItem"("parentId");
CREATE INDEX "MenuItem_type_targetId_idx" ON "MenuItem"("type", "targetId");

ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Menu" ("name", "slug", "description", "location", "isActive", "updatedAt")
VALUES ('主菜单', 'primary', '站点主导航', 'PRIMARY', true, CURRENT_TIMESTAMP);

INSERT INTO "MenuItem" ("menuId", "title", "url", "type", "sort", "isVisible", "updatedAt")
SELECT "id", '文库', '/posts', 'CUSTOM', 0, true, CURRENT_TIMESTAMP FROM "Menu" WHERE "slug" = 'primary';

INSERT INTO "MenuItem" ("menuId", "title", "url", "type", "sort", "isVisible", "updatedAt")
SELECT "id", '专栏', '/archive', 'ARCHIVE', 1, true, CURRENT_TIMESTAMP FROM "Menu" WHERE "slug" = 'primary';

INSERT INTO "MenuItem" ("menuId", "title", "url", "type", "sort", "isVisible", "updatedAt")
SELECT "id", '友链', '/link', 'PAGE', 2, true, CURRENT_TIMESTAMP FROM "Menu" WHERE "slug" = 'primary';

INSERT INTO "MenuItem" ("menuId", "title", "url", "type", "sort", "isVisible", "updatedAt")
SELECT "id", '我的', '/about', 'PAGE', 3, true, CURRENT_TIMESTAMP FROM "Menu" WHERE "slug" = 'primary';
