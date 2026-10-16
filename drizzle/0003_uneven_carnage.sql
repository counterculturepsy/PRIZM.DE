CREATE TYPE "public"."audit_finding_category" AS ENUM('seo', 'accessibility', 'performance', 'security', 'mobile', 'content', 'technology');--> statement-breakpoint
CREATE TYPE "public"."audit_finding_severity" AS ENUM('info', 'low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."audit_job_status" AS ENUM('queued', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."audit_page_status" AS ENUM('completed', 'failed', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."website_audit_status" AS ENUM('queued', 'running', 'completed', 'partial', 'failed', 'blocked');--> statement-breakpoint
CREATE TABLE "audit_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"audit_id" uuid NOT NULL,
	"page_id" uuid,
	"category" "audit_finding_category" NOT NULL,
	"code" text NOT NULL,
	"severity" "audit_finding_severity" NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"evidence" text NOT NULL,
	"source_url" text NOT NULL,
	"confidence" "data_confidence" DEFAULT 'high' NOT NULL,
	"score_impact" integer DEFAULT 0 NOT NULL,
	"observed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"audit_id" uuid NOT NULL,
	"status" "audit_job_status" DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"run_after" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"worker_id" text,
	"last_error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"audit_id" uuid NOT NULL,
	"url" text NOT NULL,
	"status" "audit_page_status" NOT NULL,
	"http_status" integer,
	"content_type" text,
	"response_bytes" integer,
	"duration_ms" integer,
	"title" text,
	"error_code" text,
	"fetched_at" timestamp with time zone NOT NULL,
	CONSTRAINT "audit_pages_workspace_id_unique" UNIQUE("workspace_id","id")
);
--> statement-breakpoint
CREATE TABLE "website_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"status" "website_audit_status" DEFAULT 'queued' NOT NULL,
	"authorization_basis" text NOT NULL,
	"policy_version" text DEFAULT 'single-page-v1' NOT NULL,
	"scoring_version" text DEFAULT 'diagnostic-v1' NOT NULL,
	"robots_allowed" boolean,
	"score" integer,
	"error_code" text,
	"error_message" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	CONSTRAINT "website_audits_workspace_id_unique" UNIQUE("workspace_id","id")
);
--> statement-breakpoint
CREATE TABLE "websites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"url" text NOT NULL,
	"normalized_origin" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "websites_workspace_id_unique" UNIQUE("workspace_id","id")
);
--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_workspace_id_unique" UNIQUE("workspace_id","id");--> statement-breakpoint
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_audit_id_website_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."website_audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_page_id_audit_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."audit_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_workspace_audit_fk" FOREIGN KEY ("workspace_id","audit_id") REFERENCES "public"."website_audits"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_workspace_page_fk" FOREIGN KEY ("workspace_id","page_id") REFERENCES "public"."audit_pages"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_jobs" ADD CONSTRAINT "audit_jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_jobs" ADD CONSTRAINT "audit_jobs_audit_id_website_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."website_audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_jobs" ADD CONSTRAINT "audit_jobs_workspace_audit_fk" FOREIGN KEY ("workspace_id","audit_id") REFERENCES "public"."website_audits"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_pages" ADD CONSTRAINT "audit_pages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_pages" ADD CONSTRAINT "audit_pages_audit_id_website_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."website_audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_pages" ADD CONSTRAINT "audit_pages_workspace_audit_fk" FOREIGN KEY ("workspace_id","audit_id") REFERENCES "public"."website_audits"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_audits" ADD CONSTRAINT "website_audits_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_audits" ADD CONSTRAINT "website_audits_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_audits" ADD CONSTRAINT "website_audits_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_audits" ADD CONSTRAINT "website_audits_workspace_website_fk" FOREIGN KEY ("workspace_id","website_id") REFERENCES "public"."websites"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websites" ADD CONSTRAINT "websites_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websites" ADD CONSTRAINT "websites_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websites" ADD CONSTRAINT "websites_workspace_company_fk" FOREIGN KEY ("workspace_id","company_id") REFERENCES "public"."companies"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "audit_findings_workspace_audit_code_unique" ON "audit_findings" USING btree ("workspace_id","audit_id","code");--> statement-breakpoint
CREATE INDEX "audit_findings_workspace_audit_idx" ON "audit_findings" USING btree ("workspace_id","audit_id","severity");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_jobs_workspace_audit_unique" ON "audit_jobs" USING btree ("workspace_id","audit_id");--> statement-breakpoint
CREATE INDEX "audit_jobs_status_run_after_idx" ON "audit_jobs" USING btree ("status","run_after");--> statement-breakpoint
CREATE INDEX "audit_pages_workspace_audit_idx" ON "audit_pages" USING btree ("workspace_id","audit_id");--> statement-breakpoint
CREATE INDEX "website_audits_workspace_status_idx" ON "website_audits" USING btree ("workspace_id","status","requested_at");--> statement-breakpoint
CREATE INDEX "website_audits_workspace_website_idx" ON "website_audits" USING btree ("workspace_id","website_id","requested_at");--> statement-breakpoint
CREATE UNIQUE INDEX "websites_workspace_origin_unique" ON "websites" USING btree ("workspace_id","normalized_origin");--> statement-breakpoint
CREATE INDEX "websites_workspace_company_idx" ON "websites" USING btree ("workspace_id","company_id");
