CREATE TYPE "public"."success_trigger" AS ENUM('url_change', 'element_appears');--> statement-breakpoint
CREATE TYPE "public"."step_action" AS ENUM('fill', 'click', 'wait');--> statement-breakpoint
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
ALTER TABLE "mappings" ADD CONSTRAINT "mappings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steps" ADD CONSTRAINT "steps_mapping_id_mappings_id_fk" FOREIGN KEY ("mapping_id") REFERENCES "public"."mappings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_mappings_project_id" ON "mappings" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_mappings_project_active" ON "mappings" USING btree ("project_id","is_active") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_steps_mapping_id" ON "steps" USING btree ("mapping_id");--> statement-breakpoint
CREATE INDEX "idx_steps_mapping_order" ON "steps" USING btree ("mapping_id","step_order");