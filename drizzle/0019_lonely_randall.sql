CREATE TABLE "consent_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consent_record_id" uuid NOT NULL,
	"policy_version_id" uuid NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"event_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" varchar(50) DEFAULT 'web' NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_consent_record_id_consent_records_id_fk" FOREIGN KEY ("consent_record_id") REFERENCES "public"."consent_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_policy_version_id_consent_policy_versions_id_fk" FOREIGN KEY ("policy_version_id") REFERENCES "public"."consent_policy_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consent_events_record_idx" ON "consent_events" USING btree ("consent_record_id");--> statement-breakpoint
CREATE INDEX "consent_events_policy_version_idx" ON "consent_events" USING btree ("policy_version_id");--> statement-breakpoint
CREATE INDEX "consent_events_type_idx" ON "consent_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "consent_events_occurred_at_idx" ON "consent_events" USING btree ("occurred_at");