CREATE TYPE "PostRelationType" AS ENUM ('PREREQUISITE', 'EXTENSION', 'SAME_TOPIC', 'PRACTICE', 'BACKGROUND');

CREATE TYPE "PostRelationSource" AS ENUM ('AI', 'MANUAL');

CREATE TABLE "PostRelation" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "relatedPostId" INTEGER NOT NULL,
    "reason" TEXT,
    "type" "PostRelationType" NOT NULL,
    "source" "PostRelationSource" NOT NULL DEFAULT 'AI',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostRelation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PostRelation_postId_relatedPostId_key" ON "PostRelation"("postId", "relatedPostId");

CREATE INDEX "PostRelation_postId_sort_idx" ON "PostRelation"("postId", "sort");

CREATE INDEX "PostRelation_relatedPostId_idx" ON "PostRelation"("relatedPostId");

ALTER TABLE "PostRelation" ADD CONSTRAINT "PostRelation_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostRelation" ADD CONSTRAINT "PostRelation_relatedPostId_fkey" FOREIGN KEY ("relatedPostId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
