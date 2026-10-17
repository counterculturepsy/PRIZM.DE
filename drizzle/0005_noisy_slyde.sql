CREATE TYPE "public"."contact_channel" AS ENUM('email', 'phone');--> statement-breakpoint
CREATE TYPE "public"."crm_activity_type" AS ENUM('lead_created', 'stage_changed', 'note_added', 'contact_added', 'task_created', 'task_completed', 'contact_suppressed');--> statement-breakpoint
CREATE TYPE "public"."crm_task_status" AS ENUM('open', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."deal_stage" AS ENUM('identified', 'contacted', 'discovery', 'proposal', 'negotiation', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'qualified', 'unqualified', 'converted', 'archived');--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text,
	"role_title" text,
	"email" text,
	"normalized_email" text,
	"phone" text,
	"normalized_phone" text,
	"source_kind" "fact_kind" DEFAULT 'user_supplied' NOT NULL,
	"source_label" text NOT NULL,
	"source_url" text,
	"confidence" "data_confidence" DEFAULT 'medium' NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"do_not_contact" boolean DEFAULT false NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_workspace_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "contacts_contact_method_check" CHECK ("contacts"."normalized_email" is not null or "contacts"."normalized_phone" is not null)
);
--> statement-breakpoint
CREATE TABLE "crm_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"contact_id" uuid,
	"actor_user_id" uuid NOT NULL,
	"type" "crm_activity_type" NOT NULL,
	"summary" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_activities_summary_check" CHECK (char_length("crm_activities"."summary") between 1 and 500)
);
--> statement-breakpoint
CREATE TABLE "crm_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_notes_body_check" CHECK (char_length("crm_notes"."body") between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "crm_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"assigned_to_user_id" uuid,
	"created_by_user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_at" timestamp with time zone,
	"status" "crm_task_status" DEFAULT 'open' NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_tasks_workspace_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "crm_tasks_title_check" CHECK (char_length("crm_tasks"."title") between 1 and 160)
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"stage" "deal_stage" DEFAULT 'identified' NOT NULL,
	"value_minor" integer,
	"currency" text NOT NULL,
	"expected_close_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"lost_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deals_workspace_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "deals_value_check" CHECK ("deals"."value_minor" is null or "deals"."value_minor" >= 0),
	CONSTRAINT "deals_currency_check" CHECK (char_length("deals"."currency") = 3)
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"source_opportunity_id" uuid,
	"owner_user_id" uuid,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"title" text NOT NULL,
	"qualification_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_workspace_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "leads_workspace_company_id_unique" UNIQUE("workspace_id","company_id","id")
);
--> statement-breakpoint
CREATE TABLE "suppression_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"contact_id" uuid,
	"channel" "contact_channel" NOT NULL,
	"normalized_value" text NOT NULL,
	"reason" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppression_entries_reason_check" CHECK (char_length("suppression_entries"."reason") between 2 and 500)
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_workspace_company_fk" FOREIGN KEY ("workspace_id","company_id") REFERENCES "public"."companies"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_workspace_lead_fk" FOREIGN KEY ("workspace_id","lead_id") REFERENCES "public"."leads"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_workspace_contact_fk" FOREIGN KEY ("workspace_id","contact_id") REFERENCES "public"."contacts"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_workspace_actor_fk" FOREIGN KEY ("workspace_id","actor_user_id") REFERENCES "public"."workspace_members"("workspace_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_notes" ADD CONSTRAINT "crm_notes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_notes" ADD CONSTRAINT "crm_notes_workspace_lead_fk" FOREIGN KEY ("workspace_id","lead_id") REFERENCES "public"."leads"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_notes" ADD CONSTRAINT "crm_notes_workspace_author_fk" FOREIGN KEY ("workspace_id","author_user_id") REFERENCES "public"."workspace_members"("workspace_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_workspace_lead_fk" FOREIGN KEY ("workspace_id","lead_id") REFERENCES "public"."leads"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_workspace_assignee_fk" FOREIGN KEY ("workspace_id","assigned_to_user_id") REFERENCES "public"."workspace_members"("workspace_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_workspace_creator_fk" FOREIGN KEY ("workspace_id","created_by_user_id") REFERENCES "public"."workspace_members"("workspace_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_workspace_lead_fk" FOREIGN KEY ("workspace_id","lead_id") REFERENCES "public"."leads"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_workspace_company_fk" FOREIGN KEY ("workspace_id","company_id") REFERENCES "public"."companies"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_workspace_company_id_unique" UNIQUE("workspace_id","company_id","id");--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_workspace_company_opportunity_fk" FOREIGN KEY ("workspace_id","company_id","source_opportunity_id") REFERENCES "public"."opportunities"("workspace_id","company_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_workspace_owner_fk" FOREIGN KEY ("workspace_id","owner_user_id") REFERENCES "public"."workspace_members"("workspace_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppression_entries" ADD CONSTRAINT "suppression_entries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppression_entries" ADD CONSTRAINT "suppression_entries_workspace_contact_fk" FOREIGN KEY ("workspace_id","contact_id") REFERENCES "public"."contacts"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppression_entries" ADD CONSTRAINT "suppression_entries_workspace_creator_fk" FOREIGN KEY ("workspace_id","created_by_user_id") REFERENCES "public"."workspace_members"("workspace_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contacts_workspace_company_idx" ON "contacts" USING btree ("workspace_id","company_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_workspace_company_email_unique" ON "contacts" USING btree ("workspace_id","company_id","normalized_email") WHERE "contacts"."normalized_email" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_workspace_company_phone_unique" ON "contacts" USING btree ("workspace_id","company_id","normalized_phone") WHERE "contacts"."normalized_phone" is not null;--> statement-breakpoint
CREATE INDEX "crm_activities_workspace_occurred_idx" ON "crm_activities" USING btree ("workspace_id","occurred_at");--> statement-breakpoint
CREATE INDEX "crm_activities_workspace_lead_idx" ON "crm_activities" USING btree ("workspace_id","lead_id","occurred_at");--> statement-breakpoint
CREATE INDEX "crm_notes_workspace_lead_idx" ON "crm_notes" USING btree ("workspace_id","lead_id","created_at");--> statement-breakpoint
CREATE INDEX "crm_tasks_workspace_status_due_idx" ON "crm_tasks" USING btree ("workspace_id","status","due_at");--> statement-breakpoint
CREATE INDEX "crm_tasks_workspace_lead_idx" ON "crm_tasks" USING btree ("workspace_id","lead_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "deals_workspace_lead_unique" ON "deals" USING btree ("workspace_id","lead_id");--> statement-breakpoint
CREATE INDEX "deals_workspace_stage_idx" ON "deals" USING btree ("workspace_id","stage","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_workspace_company_unique" ON "leads" USING btree ("workspace_id","company_id");--> statement-breakpoint
CREATE INDEX "leads_workspace_status_idx" ON "leads" USING btree ("workspace_id","status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "suppression_entries_workspace_channel_value_unique" ON "suppression_entries" USING btree ("workspace_id","channel","normalized_value");--> statement-breakpoint
CREATE INDEX "suppression_entries_workspace_contact_idx" ON "suppression_entries" USING btree ("workspace_id","contact_id");
