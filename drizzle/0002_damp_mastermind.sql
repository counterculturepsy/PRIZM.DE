CREATE TYPE "public"."data_confidence" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."discovery_run_status" AS ENUM('running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."fact_kind" AS ENUM('observed', 'user_supplied', 'inferred', 'unknown');--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"description" text,
	"industry" text,
	"employee_estimate" integer,
	"address" text,
	"city" text,
	"province" text,
	"postal_code" text,
	"country_code" text DEFAULT 'ZA' NOT NULL,
	"website" text,
	"domain" text,
	"phone" text,
	"email" text,
	"whatsapp" text,
	"facebook_url" text,
	"instagram_url" text,
	"linkedin_url" text,
	"google_maps_url" text,
	"rating_hundredths" integer,
	"review_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"source_key" text NOT NULL,
	"external_id" text,
	"source_url" text,
	"confidence" "data_confidence" DEFAULT 'medium' NOT NULL,
	"kind" "fact_kind" DEFAULT 'user_supplied' NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discovery_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"status" "discovery_run_status" DEFAULT 'running' NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result_count" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_sources" ADD CONSTRAINT "company_sources_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_sources" ADD CONSTRAINT "company_sources_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_runs" ADD CONSTRAINT "discovery_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_runs" ADD CONSTRAINT "discovery_runs_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "companies_workspace_dedupe_unique" ON "companies" USING btree ("workspace_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "companies_workspace_name_idx" ON "companies" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "companies_workspace_location_idx" ON "companies" USING btree ("workspace_id","province","city");--> statement-breakpoint
CREATE INDEX "companies_workspace_industry_idx" ON "companies" USING btree ("workspace_id","industry");--> statement-breakpoint
CREATE UNIQUE INDEX "company_sources_workspace_source_unique" ON "company_sources" USING btree ("workspace_id","source_key");--> statement-breakpoint
CREATE INDEX "company_sources_workspace_company_idx" ON "company_sources" USING btree ("workspace_id","company_id");--> statement-breakpoint
CREATE INDEX "company_sources_workspace_provider_idx" ON "company_sources" USING btree ("workspace_id","provider");--> statement-breakpoint
CREATE INDEX "discovery_runs_workspace_started_idx" ON "discovery_runs" USING btree ("workspace_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_searches_workspace_name_unique" ON "saved_searches" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "saved_searches_workspace_created_idx" ON "saved_searches" USING btree ("workspace_id","created_at");