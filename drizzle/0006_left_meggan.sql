CREATE TYPE "public"."ai_draft_purpose" AS ENUM('strategy', 'outreach');--> statement-breakpoint
CREATE TYPE "public"."ai_draft_status" AS ENUM('running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ai_review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "ai_draft_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"request_key" uuid NOT NULL,
	"purpose" "ai_draft_purpose" NOT NULL,
	"status" "ai_draft_status" DEFAULT 'running' NOT NULL,
	"review_status" "ai_review_status" DEFAULT 'pending' NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"output" jsonb,
	"error_code" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"duration_ms" integer,
	"reviewer_user_id" uuid,
	"review_note" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "ai_runs_review_check" CHECK (("ai_draft_runs"."review_status" = 'pending' and "ai_draft_runs"."reviewed_at" is null and "ai_draft_runs"."reviewer_user_id" is null) or ("ai_draft_runs"."status" = 'completed' and "ai_draft_runs"."reviewed_at" is not null and "ai_draft_runs"."reviewer_user_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "ai_workspace_policies" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"daily_request_limit" integer DEFAULT 10 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_policy_limit_check" CHECK ("ai_workspace_policies"."daily_request_limit" between 1 and 100)
);
--> statement-breakpoint
ALTER TABLE "ai_draft_runs" ADD CONSTRAINT "ai_draft_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_draft_runs" ADD CONSTRAINT "ai_runs_workspace_lead_fk" FOREIGN KEY ("workspace_id","lead_id") REFERENCES "public"."leads"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_draft_runs" ADD CONSTRAINT "ai_runs_workspace_actor_fk" FOREIGN KEY ("workspace_id","actor_user_id") REFERENCES "public"."workspace_members"("workspace_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_draft_runs" ADD CONSTRAINT "ai_runs_workspace_reviewer_fk" FOREIGN KEY ("workspace_id","reviewer_user_id") REFERENCES "public"."workspace_members"("workspace_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_workspace_policies" ADD CONSTRAINT "ai_workspace_policies_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_runs_workspace_request_unique" ON "ai_draft_runs" USING btree ("workspace_id","request_key");--> statement-breakpoint
CREATE INDEX "ai_runs_workspace_created_idx" ON "ai_draft_runs" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_runs_workspace_lead_idx" ON "ai_draft_runs" USING btree ("workspace_id","lead_id");