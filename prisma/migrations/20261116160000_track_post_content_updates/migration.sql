BEGIN;

-- Historical updatedAt values include views and cannot backfill this field reliably.
ALTER TABLE "Post" ADD COLUMN "contentUpdatedAt" TIMESTAMP(3);

CREATE FUNCTION track_post_content_updated_at() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW."contentUpdatedAt" := NEW."publishedAt";
    ELSIF ROW(NEW."title", NEW."slug", NEW."summary", NEW."content", NEW."cover",
              NEW."categoryId", NEW."seoTitle", NEW."seoDescription", NEW."publishedAt")
          IS DISTINCT FROM
          ROW(OLD."title", OLD."slug", OLD."summary", OLD."content", OLD."cover",
              OLD."categoryId", OLD."seoTitle", OLD."seoDescription", OLD."publishedAt") THEN
        NEW."contentUpdatedAt" := GREATEST(NEW."publishedAt", timezone('UTC', clock_timestamp()));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_content_updated_at
BEFORE INSERT OR UPDATE OF "title", "slug", "summary", "content", "cover", "categoryId",
    "seoTitle", "seoDescription", "publishedAt" ON "Post"
FOR EACH ROW EXECUTE FUNCTION track_post_content_updated_at();

COMMIT;
