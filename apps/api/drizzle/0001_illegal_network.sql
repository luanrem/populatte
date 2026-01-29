CREATE TYPE "public"."batch_mode" AS ENUM('LIST_MODE', 'PROFILE_MODE');--> statement-breakpoint
CREATE TYPE "public"."batch_status" AS ENUM('PENDING_REVIEW', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."row_status" AS ENUM('VALID', 'WARNING', 'ERROR');--> statement-breakpoint
CREATE TABLE "ingestion_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"mode" "batch_mode" NOT NULL,
	"status" "batch_status" DEFAULT 'PENDING_REVIEW' NOT NULL,
	"file_count" integer NOT NULL,
	"row_count" integer NOT NULL,
	"column_metadata" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid
);
--> statement-breakpoint
CREATE TABLE "ingestion_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"status" "row_status" DEFAULT 'VALID' NOT NULL,
	"validation_messages" jsonb DEFAULT '[]' NOT NULL,
	"source_file_name" text NOT NULL,
	"source_sheet_name" text NOT NULL,
	"source_row_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "ingestion_batches" ADD CONSTRAINT "ingestion_batches_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_batches" ADD CONSTRAINT "ingestion_batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_batches" ADD CONSTRAINT "ingestion_batches_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_rows" ADD CONSTRAINT "ingestion_rows_batch_id_ingestion_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."ingestion_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ingestion_batches_project_id" ON "ingestion_batches" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_ingestion_batches_user_id" ON "ingestion_batches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ingestion_rows_batch_id" ON "ingestion_rows" USING btree ("batch_id");