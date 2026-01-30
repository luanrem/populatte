ALTER TYPE "public"."row_status" ADD VALUE 'DRAFT' BEFORE 'VALID';--> statement-breakpoint
ALTER TABLE "ingestion_rows" ALTER COLUMN "status" SET DEFAULT 'DRAFT';