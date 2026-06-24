ALTER TABLE "projects" ADD COLUMN "urls" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "projects"
SET "urls" = jsonb_build_array(
	jsonb_build_object('url', "target_url", 'isPrimary', true)
)
WHERE "target_url" IS NOT NULL AND "target_url" <> '';
