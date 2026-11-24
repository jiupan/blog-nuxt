WITH fields(source, target, max_length) AS (
  VALUES ('sidebar_author_name', 'name', 80),
         ('sidebar_author_subtitle', 'subtitle', 160),
         ('sidebar_author_description', 'description', 2400)
),
profile AS (
  SELECT target, max_length, CASE
    WHEN target = 'subtitle' THEN COALESCE(NULLIF(BTRIM("value"), '独立写作者'), '')
    ELSE COALESCE(BTRIM("value"), '')
  END AS value
  FROM fields
  LEFT JOIN "Setting" ON "key" = source
),
bounded AS (
  SELECT target, COALESCE((
    SELECT STRING_AGG(symbol, '' ORDER BY ordinal)
    FROM (
      -- Match the editor's UTF-16 limit without splitting supplementary characters.
      SELECT symbol, ordinal, SUM(CASE WHEN ASCII(symbol) > 65535 THEN 2 ELSE 1 END)
        OVER (ORDER BY ordinal) AS units
      FROM UNNEST(STRING_TO_ARRAY(LEFT(value, max_length), NULL)) WITH ORDINALITY AS parts(symbol, ordinal)
    ) AS measured
    WHERE units <= max_length
  ), '') AS value
  FROM profile
)
INSERT INTO "Setting" ("key", "value", "updatedAt")
SELECT
  'about_profile',
  (JSONB_OBJECT_AGG(target, value) || '{"groups":[]}'::jsonb)::text,
  CURRENT_TIMESTAMP
FROM bounded
HAVING BOOL_OR(value <> '')
ON CONFLICT ("key") DO NOTHING;
