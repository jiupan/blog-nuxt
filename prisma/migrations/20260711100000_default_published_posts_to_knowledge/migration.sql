INSERT INTO "KnowledgeDocument" (
  "postId", "enabled", "status", "sourceHash", "chunkCount", "tokenCount", "createdAt", "updatedAt"
)
SELECT
  p."id", true, 'PENDING'::"KnowledgeDocumentStatus", '', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Post" p
WHERE p."status" = 'PUBLISHED'
  AND p."publishedAt" <= CURRENT_TIMESTAMP
  AND NOT EXISTS (
    SELECT 1 FROM "KnowledgeDocument" d WHERE d."postId" = p."id"
  );
