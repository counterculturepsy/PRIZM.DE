CREATE TYPE "public"."campaign_event_kind" AS ENUM('delivered', 'bounced', 'complained', 'unsubscribed');--> statement-breakpoint
CREATE TYPE "public"."campaign_message_status" AS ENUM('queued', 'processing', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'suppressed', 'cancelled');--> statement-breakpoint
CREATE TABLE "campaign_delivery_usage" (
	"workspace_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"utc_date" text NOT NULL,
	"reserved_attempts" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_delivery_usage_workspace_id_campaign_id_utc_date_pk" PRIMARY KEY("workspace_id","campaign_id","utc_date"),
	CONSTRAINT "campaign_delivery_usage_date_check" CHECK ("campaign_delivery_usage"."utc_date" ~ '^\d{4}-\d{2}-\d{2}$'),
	CONSTRAINT "campaign_delivery_usage_count_check" CHECK ("campaign_delivery_usage"."reserved_attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "campaign_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"normalized_email" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" "campaign_message_status" DEFAULT 'queued' NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"lease_until" timestamp with time zone,
	"worker_id" text,
	"provider" text,
	"provider_message_id" text,
	"provider_idempotency_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"last_error_code" text,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"bounced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_messages_workspace_id_unique" UNIQUE("workspace_id","id"),
	CONSTRAINT "campaign_messages_content_check" CHECK (char_length("campaign_messages"."subject") between 2 and 200 and char_length("campaign_messages"."body") between 10 and 5000),
	CONSTRAINT "campaign_messages_attempts_check" CHECK ("campaign_messages"."attempts" between 0 and "campaign_messages"."max_attempts" and "campaign_messages"."max_attempts" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "campaign_provider_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_event_id" text NOT NULL,
	"kind" "campaign_event_kind" NOT NULL,
	"payload_hash" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_provider_events_fields_check" CHECK (char_length("campaign_provider_events"."provider") between 2 and 100 and char_length("campaign_provider_events"."external_event_id") between 1 and 300 and char_length("campaign_provider_events"."payload_hash") = 64)
);
--> statement-breakpoint
CREATE TABLE "campaign_unsubscribe_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"normalized_email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_unsubscribe_tokens_hash_check" CHECK (char_length("campaign_unsubscribe_tokens"."token_hash") = 64)
);
--> statement-breakpoint
ALTER TABLE "campaigns" DROP CONSTRAINT "campaigns_review_check";--> statement-breakpoint
ALTER TABLE "suppression_entries" ALTER COLUMN "created_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "staged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "suppression_entries" ADD COLUMN "source" text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE "campaign_delivery_usage" ADD CONSTRAINT "campaign_delivery_usage_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_delivery_usage" ADD CONSTRAINT "campaign_delivery_usage_campaign_fk" FOREIGN KEY ("workspace_id","campaign_id") REFERENCES "public"."campaigns"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_messages" ADD CONSTRAINT "campaign_messages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_messages" ADD CONSTRAINT "campaign_messages_campaign_fk" FOREIGN KEY ("workspace_id","campaign_id") REFERENCES "public"."campaigns"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_workspace_campaign_id_unique" UNIQUE("workspace_id","campaign_id","id");--> statement-breakpoint
ALTER TABLE "campaign_steps" ADD CONSTRAINT "campaign_steps_workspace_campaign_id_unique" UNIQUE("workspace_id","campaign_id","id");--> statement-breakpoint
ALTER TABLE "campaign_messages" ADD CONSTRAINT "campaign_messages_step_fk" FOREIGN KEY ("workspace_id","campaign_id","step_id") REFERENCES "public"."campaign_steps"("workspace_id","campaign_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_messages" ADD CONSTRAINT "campaign_messages_recipient_fk" FOREIGN KEY ("workspace_id","campaign_id","recipient_id") REFERENCES "public"."campaign_recipients"("workspace_id","campaign_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_provider_events" ADD CONSTRAINT "campaign_provider_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_provider_events" ADD CONSTRAINT "campaign_provider_events_message_fk" FOREIGN KEY ("workspace_id","message_id") REFERENCES "public"."campaign_messages"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_unsubscribe_tokens" ADD CONSTRAINT "campaign_unsubscribe_tokens_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_unsubscribe_tokens" ADD CONSTRAINT "campaign_unsubscribe_tokens_message_fk" FOREIGN KEY ("workspace_id","message_id") REFERENCES "public"."campaign_messages"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_messages_campaign_step_recipient_unique" ON "campaign_messages" USING btree ("workspace_id","campaign_id","step_id","recipient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_messages_provider_message_unique" ON "campaign_messages" USING btree ("provider","provider_message_id") WHERE "campaign_messages"."provider_message_id" is not null;--> statement-breakpoint
CREATE INDEX "campaign_messages_queue_idx" ON "campaign_messages" USING btree ("status","scheduled_for","created_at");--> statement-breakpoint
CREATE INDEX "campaign_messages_workspace_campaign_idx" ON "campaign_messages" USING btree ("workspace_id","campaign_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_provider_events_provider_external_unique" ON "campaign_provider_events" USING btree ("provider","external_event_id");--> statement-breakpoint
CREATE INDEX "campaign_provider_events_workspace_message_idx" ON "campaign_provider_events" USING btree ("workspace_id","message_id","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_unsubscribe_tokens_hash_unique" ON "campaign_unsubscribe_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_unsubscribe_tokens_message_unique" ON "campaign_unsubscribe_tokens" USING btree ("workspace_id","message_id");--> statement-breakpoint
CREATE INDEX "campaign_unsubscribe_tokens_expires_idx" ON "campaign_unsubscribe_tokens" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_review_check" CHECK (("campaigns"."status" = 'draft' and "campaigns"."reviewed_at" is null and "campaigns"."reviewed_by_user_id" is null and "campaigns"."review_note" is null and "campaigns"."staged_at" is null) or ("campaigns"."status" = 'reviewed' and "campaigns"."reviewed_at" is not null and "campaigns"."reviewed_by_user_id" is not null and "campaigns"."review_note" is not null));--> statement-breakpoint
ALTER TABLE "suppression_entries" ADD CONSTRAINT "suppression_entries_source_check" CHECK ("suppression_entries"."source" in ('member', 'recipient_unsubscribe', 'provider_bounce', 'provider_complaint'));
