ALTER TABLE "ingestion_batches" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "ingestion_batches" ALTER COLUMN "status" SET DEFAULT 'PROCESSING'::text;--> statement-breakpoint
DROP TYPE "public"."batch_status";--> statement-breakpoint
CREATE TYPE "public"."batch_status" AS ENUM('PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
ALTER TABLE "ingestion_batches" ALTER COLUMN "status" SET DEFAULT 'PROCESSING'::"public"."batch_status";--> statement-breakpoint
ALTER TABLE "ingestion_batches" ALTER COLUMN "status" SET DATA TYPE "public"."batch_status" USING "status"::"public"."batch_status";