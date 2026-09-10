CREATE TABLE IF NOT EXISTS "california_opt_out_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"consent_id" varchar(255) NOT NULL,
	"visitor_id" varchar(255),
	"state" varchar(40) DEFAULT 'unknown' NOT NULL,
	"source" varchar(40) DEFAULT 'none' NOT NULL,
	"sale_opt_out" boolean DEFAULT false NOT NULL,
	"share_opt_out" boolean DEFAULT false NOT NULL,
	"sensitive_pi_limit" boolean DEFAULT false NOT NULL,
	"gpc_header" varchar(20) DEFAULT 'absent' NOT NULL,
	"gpc_client" varchar(20) DEFAULT 'unknown' NOT NULL,
	"jurisdiction" varchar(100),
	"policy_version_id" uuid,
	"effective_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "california_opt_out_org_website_consent_unique" UNIQUE("organization_id","website_id","consent_id")
);
--> statement-breakpoint
ALTER TABLE "processing_activities" ADD COLUMN IF NOT EXISTS "ccpa_sale" varchar(40) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "processing_activities" ADD COLUMN IF NOT EXISTS "ccpa_share" varchar(40) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "processing_activities" ADD COLUMN IF NOT EXISTS "ccpa_sensitive_pi" varchar(40) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "trackers" ADD COLUMN IF NOT EXISTS "ccpa_sale" varchar(40) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "trackers" ADD COLUMN IF NOT EXISTS "ccpa_share" varchar(40) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "trackers" ADD COLUMN IF NOT EXISTS "ccpa_sensitive_pi" varchar(40) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "ccpa_sale" varchar(40) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "ccpa_share" varchar(40) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "ccpa_sensitive_pi" varchar(40) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "california_opt_out_states" ADD CONSTRAINT "california_opt_out_states_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "california_opt_out_states" ADD CONSTRAINT "california_opt_out_states_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "california_opt_out_states" ADD CONSTRAINT "california_opt_out_states_policy_version_id_consent_policy_versions_id_fk" FOREIGN KEY ("policy_version_id") REFERENCES "public"."consent_policy_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "california_opt_out_org_idx" ON "california_opt_out_states" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "california_opt_out_website_idx" ON "california_opt_out_states" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "california_opt_out_consent_idx" ON "california_opt_out_states" USING btree ("consent_id");
