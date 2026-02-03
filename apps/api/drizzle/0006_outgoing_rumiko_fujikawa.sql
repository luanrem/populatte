CREATE TYPE "public"."fill_status" AS ENUM('PENDING', 'VALID', 'ERROR');--> statement-breakpoint
CREATE TABLE "extension_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ingestion_rows" ADD COLUMN "fill_status" "fill_status" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingestion_rows" ADD COLUMN "fill_error_message" text;--> statement-breakpoint
ALTER TABLE "ingestion_rows" ADD COLUMN "fill_error_step" text;--> statement-breakpoint
ALTER TABLE "ingestion_rows" ADD COLUMN "fill_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "extension_codes" ADD CONSTRAINT "extension_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_extension_codes_code" ON "extension_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_extension_codes_user_id" ON "extension_codes" USING btree ("user_id");