CREATE TYPE "public"."project_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."batch_mode" AS ENUM('LIST_MODE', 'PROFILE_MODE');--> statement-breakpoint
CREATE TYPE "public"."batch_status" AS ENUM('PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."fill_status" AS ENUM('PENDING', 'VALID', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."row_status" AS ENUM('DRAFT', 'VALID', 'WARNING', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."success_trigger" AS ENUM('url_change', 'text_appears', 'element_disappears');--> statement-breakpoint
CREATE TYPE "public"."step_action" AS ENUM('fill', 'click', 'wait', 'verify');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"image_url" text,
	"last_synced_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"source" text DEFAULT 'clerk_sync' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"target_entity" text,
	"target_url" text,
	"status" "project_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ingestion_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"mode" "batch_mode" NOT NULL,
	"name" varchar(255),
	"status" "batch_status" DEFAULT 'PROCESSING' NOT NULL,
	"file_count" integer NOT NULL,
	"row_count" integer NOT NULL,
	"column_metadata" jsonb DEFAULT '[]' NOT NULL,
	"identifier_field_key" varchar(255),
	"secondary_field_key" varchar(255),
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
	"status" "row_status" DEFAULT 'DRAFT' NOT NULL,
	"validation_messages" jsonb DEFAULT '[]' NOT NULL,
	"source_file_name" text NOT NULL,
	"source_sheet_name" text NOT NULL,
	"source_row_index" integer NOT NULL,
	"fill_status" "fill_status" DEFAULT 'PENDING' NOT NULL,
	"fill_error_message" text,
	"fill_error_step" text,
	"fill_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"target_url" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"success_trigger" "success_trigger",
	"success_config" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mapping_id" uuid NOT NULL,
	"action" "step_action" NOT NULL,
	"selector" jsonb NOT NULL,
	"selector_fallbacks" jsonb DEFAULT '[]' NOT NULL,
	"source_field_key" text,
	"fixed_value" text,
	"step_order" integer NOT NULL,
	"optional" boolean DEFAULT false NOT NULL,
	"clear_before" boolean DEFAULT false NOT NULL,
	"press_enter" boolean DEFAULT false NOT NULL,
	"wait_ms" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "extension_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_batches" ADD CONSTRAINT "ingestion_batches_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_batches" ADD CONSTRAINT "ingestion_batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_batches" ADD CONSTRAINT "ingestion_batches_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_rows" ADD CONSTRAINT "ingestion_rows_batch_id_ingestion_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."ingestion_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mappings" ADD CONSTRAINT "mappings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_mapping_id_mappings_id_fk" FOREIGN KEY ("mapping_id") REFERENCES "public"."mappings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extension_codes" ADD CONSTRAINT "extension_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_id_unique" ON "users" USING btree ("clerk_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_projects_user_id" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_projects_user_name" ON "projects" USING btree ("user_id","name") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_ingestion_batches_project_id" ON "ingestion_batches" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_ingestion_batches_user_id" ON "ingestion_batches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ingestion_rows_batch_id" ON "ingestion_rows" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "idx_mappings_project_id" ON "mappings" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_mappings_project_active" ON "mappings" USING btree ("project_id","is_active") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_steps_mapping_id" ON "steps" USING btree ("mapping_id");--> statement-breakpoint
CREATE INDEX "idx_steps_mapping_order" ON "steps" USING btree ("mapping_id","step_order");--> statement-breakpoint
CREATE INDEX "idx_extension_codes_code" ON "extension_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_extension_codes_user_id" ON "extension_codes" USING btree ("user_id");