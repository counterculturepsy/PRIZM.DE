CREATE TYPE "public"."proposal_status" AS ENUM('draft', 'approved', 'declined', 'expired', 'superseded');--> statement-breakpoint
CREATE TABLE "proposal_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"proposal_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposal_versions_version_check" CHECK ("proposal_versions"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"request_key" uuid NOT NULL,
	"title" text NOT NULL,
	"status" "proposal_status" DEFAULT 'draft' NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"approved_by_user_id" uuid,
	"approval_note" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposals_workspace_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "proposals_version_check" CHECK ("proposals"."current_version" >= 1),
	CONSTRAINT "proposals_approval_check" CHECK (("proposals"."status" = 'approved' and "proposals"."approved_at" is not null and "proposals"."approved_by_user_id" is not null and "proposals"."approval_note" is not null) or ("proposals"."status" <> 'approved' and "proposals"."approved_at" is null and "proposals"."approved_by_user_id" is null and "proposals"."approval_note" is null))
);
--> statement-breakpoint
ALTER TABLE "proposal_versions" ADD CONSTRAINT "proposal_versions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_versions" ADD CONSTRAINT "proposal_versions_workspace_proposal_fk" FOREIGN KEY ("workspace_id","proposal_id") REFERENCES "public"."proposals"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_versions" ADD CONSTRAINT "proposal_versions_workspace_creator_fk" FOREIGN KEY ("workspace_id","created_by_user_id") REFERENCES "public"."workspace_members"("workspace_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_workspace_lead_fk" FOREIGN KEY ("workspace_id","lead_id") REFERENCES "public"."leads"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_workspace_creator_fk" FOREIGN KEY ("workspace_id","created_by_user_id") REFERENCES "public"."workspace_members"("workspace_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_workspace_approver_fk" FOREIGN KEY ("workspace_id","approved_by_user_id") REFERENCES "public"."workspace_members"("workspace_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "proposal_versions_workspace_proposal_version_unique" ON "proposal_versions" USING btree ("workspace_id","proposal_id","version");--> statement-breakpoint
CREATE INDEX "proposal_versions_workspace_created_idx" ON "proposal_versions" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "proposals_workspace_request_unique" ON "proposals" USING btree ("workspace_id","request_key");--> statement-breakpoint
CREATE INDEX "proposals_workspace_lead_idx" ON "proposals" USING btree ("workspace_id","lead_id","updated_at");