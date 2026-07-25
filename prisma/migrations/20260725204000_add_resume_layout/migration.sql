ALTER TABLE "Resume"
ADD COLUMN "layout" JSONB NOT NULL DEFAULT '{"sectionGap":2.2,"lineHeight":1.5,"pageMargin":5,"fontSize":10.3}';
