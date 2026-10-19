CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'reviewed');--> statement-breakpoint
CREATE TABLE "campaign_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"normalized_email" text NOT NULL,
	"contact_basis" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_recipients_basis_check" CHECK (char_length("campaign_recipients"."contact_basis") between 10 and 500)
);
--> statement-breakpoint
CREATE TABLE "campaign_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"delay_days" integer NOT NULL,
	CONSTRAINT "campaign_steps_bounds_check" CHECK ("campaign_steps"."position" between 1 and 10 and "campaign_steps"."delay_days" between 0 and 90)
);
--> statement-breakpoint
CREATE TABLE "campaign_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_templates_workspace_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "campaign_templates_length_check" CHECK (char_length("campaign_templates"."name") between 2 and 100 and char_length("campaign_templates"."subject") between 2 and 200 and char_length("campaign_templates"."body") between 10 and 5000)
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"request_key" uuid NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"daily_recipient_cap" integer NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"reviewed_by_user_id" uuid,
	"review_note" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_workspace_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "campaigns_cap_check" CHECK ("campaigns"."daily_recipient_cap" between 1 and 100),
	CONSTRAINT "campaigns_review_check" CHECK (("campaigns"."status" = 'draft' and "campaigns"."reviewed_at" is null and "campaigns"."reviewed_by_user_id" is null and "campaigns"."review_note" is null) or ("campaigns"."status" = 'reviewed' and "campaigns"."reviewed_at" is not null and "campaigns"."reviewed_by_user_id" is not null and "campaigns"."review_note" is not null))
);
--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaign_fk" FOREIGN KEY ("workspace_id","campaign_id") REFERENCES "public"."campaigns"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_contact_fk" FOREIGN KEY ("workspace_id","contact_id") REFERENCES "public"."contacts"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_creator_fk" FOREIGN KEY ("workspace_id","created_by_user_id") REFERENCES "public"."workspace_members"("workspace_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_steps" ADD CONSTRAINT "campaign_steps_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_steps" ADD CONSTRAINT "campaign_steps_campaign_fk" FOREIGN KEY ("workspace_id","campaign_id") REFERENCES "public"."campaigns"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_steps" ADD CONSTRAINT "campaign_steps_template_fk" FOREIGN KEY ("workspace_id","template_id") REFERENCES "public"."campaign_templates"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_templates" ADD CONSTRAINT "campaign_templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_templates" ADD CONSTRAINT "campaign_templates_creator_fk" FOREIGN KEY ("workspace_id","created_by_user_id") REFERENCES "public"."workspace_members"("workspace_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_creator_fk" FOREIGN KEY ("workspace_id","created_by_user_id") REFERENCES "public"."workspace_members"("workspace_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_reviewer_fk" FOREIGN KEY ("workspace_id","reviewed_by_user_id") REFERENCES "public"."workspace_members"("workspace_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_recipients_contact_unique" ON "campaign_recipients" USING btree ("workspace_id","campaign_id","contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_recipients_email_unique" ON "campaign_recipients" USING btree ("workspace_id","campaign_id","normalized_email");--> statement-breakpoint
CREATE INDEX "campaign_recipients_workspace_contact_idx" ON "campaign_recipients" USING btree ("workspace_id","contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_steps_position_unique" ON "campaign_steps" USING btree ("workspace_id","campaign_id","position");--> statement-breakpoint
CREATE INDEX "campaign_steps_workspace_template_idx" ON "campaign_steps" USING btree ("workspace_id","template_id");--> statement-breakpoint
CREATE INDEX "campaign_templates_workspace_created_idx" ON "campaign_templates" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "campaigns_workspace_request_unique" ON "campaigns" USING btree ("workspace_id","request_key");--> statement-breakpoint
CREATE INDEX "campaigns_workspace_status_idx" ON "campaigns" USING btree ("workspace_id","status","updated_at");