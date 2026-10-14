CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'revoked', 'expired');--> statement-breakpoint
CREATE TABLE "ideal_customer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text DEFAULT 'Primary ICP' NOT NULL,
	"countries" jsonb DEFAULT '["ZA"]'::jsonb NOT NULL,
	"provinces" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"industries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"company_sizes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"opportunity_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"excluded_industries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"minimum_budget_minor" integer,
	"maximum_budget_minor" integer,
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_progress" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"starting_price_minor" integer,
	"average_price_minor" integer,
	"delivery_time_days" integer,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "workspace_role" DEFAULT 'viewer' NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "job_title" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "timezone" text DEFAULT 'Africa/Johannesburg' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "currency" text DEFAULT 'ZAR' NOT NULL;--> statement-breakpoint
ALTER TABLE "ideal_customer_profiles" ADD CONSTRAINT "ideal_customer_profiles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ideal_customer_profiles_workspace_name_unique" ON "ideal_customer_profiles" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "services_workspace_slug_unique" ON "services" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE INDEX "services_workspace_active_idx" ON "services" USING btree ("workspace_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_invitations_token_hash_unique" ON "workspace_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "workspace_invitations_workspace_status_idx" ON "workspace_invitations" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "workspace_invitations_email_status_idx" ON "workspace_invitations" USING btree ("email","status");