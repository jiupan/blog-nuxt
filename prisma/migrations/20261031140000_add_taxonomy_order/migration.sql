ALTER TABLE "Category" ADD COLUMN "sort" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Tag" ADD COLUMN "sort" INTEGER NOT NULL DEFAULT 0;

-- Preserve the existing public order until the administrator chooses another one.
WITH ordered AS (
  SELECT "id", (ROW_NUMBER() OVER (ORDER BY "id") - 1)::INTEGER AS position
  FROM "Category"
)
UPDATE "Category" SET "sort" = ordered.position FROM ordered WHERE "Category"."id" = ordered."id";

WITH ordered AS (
  SELECT "id", (ROW_NUMBER() OVER (ORDER BY "name", "id") - 1)::INTEGER AS position
  FROM "Tag"
)
UPDATE "Tag" SET "sort" = ordered.position FROM ordered WHERE "Tag"."id" = ordered."id";

CREATE INDEX "Category_sort_id_idx" ON "Category"("sort", "id");
CREATE INDEX "Tag_sort_id_idx" ON "Tag"("sort", "id");
