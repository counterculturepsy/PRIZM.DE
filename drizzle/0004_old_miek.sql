CREATE TYPE "public"."lead_priority" AS ENUM('low', 'possible', 'good', 'high', 'priority');--> statement-breakpoint
CREATE TYPE "public"."opportunity_type" AS ENUM('website_improvement', 'accessibility_remediation', 'seo_improvement', 'security_hardening', 'performance_optimization', 'mobile_experience');--> statement-breakpoint
CREATE TABLE "lead_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"audit_id" uuid NOT NULL,
	"total_score" integer NOT NULL,
	"priority" "lead_priority" NOT NULL,
	"components" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scoring_version" text DEFAULT 'lead-v1' NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"source_completed_at" timestamp with time zone NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_scores_total_score_check" CHECK ("lead_scores"."total_score" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"audit_id" uuid NOT NULL,
	"service_id" uuid,
	"type" "opportunity_type" NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"business_impact" text NOT NULL,
	"recommended_solution" text NOT NULL,
	"estimated_value_min_minor" integer,
	"estimated_value_max_minor" integer,
	"currency" text,
	"confidence" "data_confidence" DEFAULT 'medium' NOT NULL,
	"generation_version" text DEFAULT 'opportunity-v1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunities_workspace_audit_id_unique" UNIQUE("workspace_id","audit_id","id"),
	CONSTRAINT "opportunities_value_min_check" CHECK ("opportunities"."estimated_value_min_minor" is null or "opportunities"."estimated_value_min_minor" >= 0),
	CONSTRAINT "opportunities_value_max_check" CHECK ("opportunities"."estimated_value_max_minor" is null or "opportunities"."estimated_value_max_minor" >= 0),
	CONSTRAINT "opportunities_value_range_check" CHECK ("opportunities"."estimated_value_min_minor" is null or "opportunities"."estimated_value_max_minor" is null or "opportunities"."estimated_value_min_minor" <= "opportunities"."estimated_value_max_minor"),
	CONSTRAINT "opportunities_currency_check" CHECK (("opportunities"."estimated_value_min_minor" is null and "opportunities"."estimated_value_max_minor" is null and "opportunities"."currency" is null) or ("opportunities"."currency" is not null and ("opportunities"."estimated_value_min_minor" is not null or "opportunities"."estimated_value_max_minor" is not null)))
);
--> statement-breakpoint
CREATE TABLE "opportunity_evidence" (
	"workspace_id" uuid NOT NULL,
	"audit_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"finding_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_evidence_workspace_id_opportunity_id_finding_id_pk" PRIMARY KEY("workspace_id","opportunity_id","finding_id")
);
--> statement-breakpoint
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_workspace_audit_id_unique" UNIQUE("workspace_id","audit_id","id");--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_workspace_id_unique" UNIQUE("workspace_id","id");--> statement-breakpoint
ALTER TABLE "lead_scores" ADD CONSTRAINT "lead_scores_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_scores" ADD CONSTRAINT "lead_scores_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_scores" ADD CONSTRAINT "lead_scores_audit_id_website_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."website_audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_scores" ADD CONSTRAINT "lead_scores_workspace_company_fk" FOREIGN KEY ("workspace_id","company_id") REFERENCES "public"."companies"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_scores" ADD CONSTRAINT "lead_scores_workspace_audit_fk" FOREIGN KEY ("workspace_id","audit_id") REFERENCES "public"."website_audits"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_audit_id_website_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."website_audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_workspace_company_fk" FOREIGN KEY ("workspace_id","company_id") REFERENCES "public"."companies"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_workspace_audit_fk" FOREIGN KEY ("workspace_id","audit_id") REFERENCES "public"."website_audits"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_workspace_service_fk" FOREIGN KEY ("workspace_id","service_id") REFERENCES "public"."services"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_evidence" ADD CONSTRAINT "opportunity_evidence_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_evidence" ADD CONSTRAINT "opportunity_evidence_audit_id_website_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."website_audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_evidence" ADD CONSTRAINT "opportunity_evidence_workspace_audit_opportunity_fk" FOREIGN KEY ("workspace_id","audit_id","opportunity_id") REFERENCES "public"."opportunities"("workspace_id","audit_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_evidence" ADD CONSTRAINT "opportunity_evidence_workspace_audit_finding_fk" FOREIGN KEY ("workspace_id","audit_id","finding_id") REFERENCES "public"."audit_findings"("workspace_id","audit_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lead_scores_workspace_audit_version_unique" ON "lead_scores" USING btree ("workspace_id","audit_id","scoring_version");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_scores_workspace_company_current_unique" ON "lead_scores" USING btree ("workspace_id","company_id") WHERE "lead_scores"."is_current" = true;--> statement-breakpoint
CREATE INDEX "lead_scores_workspace_priority_idx" ON "lead_scores" USING btree ("workspace_id","priority","total_score","calculated_at");--> statement-breakpoint
CREATE INDEX "lead_scores_workspace_company_idx" ON "lead_scores" USING btree ("workspace_id","company_id","calculated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunities_workspace_audit_type_version_unique" ON "opportunities" USING btree ("workspace_id","audit_id","type","generation_version");--> statement-breakpoint
CREATE INDEX "opportunities_workspace_company_idx" ON "opportunities" USING btree ("workspace_id","company_id","created_at");--> statement-breakpoint
CREATE INDEX "opportunities_workspace_type_idx" ON "opportunities" USING btree ("workspace_id","type","created_at");--> statement-breakpoint
CREATE INDEX "opportunity_evidence_workspace_audit_idx" ON "opportunity_evidence" USING btree ("workspace_id","audit_id");
