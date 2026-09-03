CREATE TABLE "data_principal_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid,
	"request_type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'received' NOT NULL,
	"requester_name" varchar(255) NOT NULL,
	"requester_email" varchar(320) NOT NULL,
	"requester_phone" varchar(50),
	"consent_id" varchar(255),
	"description" text NOT NULL,
	"response_notes" text,
	"acknowledge_by" timestamp with time zone NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "privacy_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"finding_type" varchar(80) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"tracker_id" uuid,
	"vendor_id" uuid,
	"purpose_id" uuid,
	"fingerprint" varchar(64) NOT NULL,
	"title" varchar(255) NOT NULL,
	"details" jsonb DEFAULT '{"whatChanged":"","previousState":{},"currentState":{},"whyItMatters":"","whatIsAffected":"","recommendedAction":""}'::jsonb NOT NULL,
	"first_detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_scan_id" uuid,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "privacy_findings_org_fingerprint_unique" UNIQUE("organization_id","fingerprint")
);
--> statement-breakpoint
CREATE TABLE "website_jurisdiction_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"region_code" varchar(16) DEFAULT '' NOT NULL,
	"policy_id" uuid NOT NULL,
	"regulation_key" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "website_jurisdiction_rules_site_geo_unique" UNIQUE("website_id","country_code","region_code")
);
--> statement-breakpoint
CREATE TABLE "website_scan_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"frequency" varchar(20) DEFAULT 'weekly' NOT NULL,
	"timezone" varchar(100) DEFAULT 'UTC' NOT NULL,
	"next_scan_at" timestamp with time zone,
	"last_scan_at" timestamp with time zone,
	"last_scan_status" varchar(50),
	"last_scan_id" uuid,
	"last_error" text,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "website_scan_schedules_website_unique" UNIQUE("website_id")
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "dpo_name" varchar(255);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "dpo_email" varchar(320);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "grievance_officer_name" varchar(255);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "grievance_officer_email" varchar(320);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "grievance_portal_url" text;--> statement-breakpoint
ALTER TABLE "purposes" ADD COLUMN "data_categories" text[];--> statement-breakpoint
ALTER TABLE "purposes" ADD COLUMN "retention_period" varchar(255);--> statement-breakpoint
ALTER TABLE "purposes" ADD COLUMN "legal_basis" varchar(50);--> statement-breakpoint
ALTER TABLE "scan_results" ADD COLUMN "page_url" varchar(2048);--> statement-breakpoint
ALTER TABLE "scans" ADD COLUMN "triggered_by" varchar(20) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "default_regulation_key" varchar(32);--> statement-breakpoint
ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "consent_integrations" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "data_principal_requests" ADD CONSTRAINT "data_principal_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_principal_requests" ADD CONSTRAINT "data_principal_requests_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_findings" ADD CONSTRAINT "privacy_findings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_findings" ADD CONSTRAINT "privacy_findings_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_findings" ADD CONSTRAINT "privacy_findings_tracker_id_trackers_id_fk" FOREIGN KEY ("tracker_id") REFERENCES "public"."trackers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_findings" ADD CONSTRAINT "privacy_findings_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_findings" ADD CONSTRAINT "privacy_findings_purpose_id_purposes_id_fk" FOREIGN KEY ("purpose_id") REFERENCES "public"."purposes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_findings" ADD CONSTRAINT "privacy_findings_last_scan_id_scans_id_fk" FOREIGN KEY ("last_scan_id") REFERENCES "public"."scans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_findings" ADD CONSTRAINT "privacy_findings_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_findings" ADD CONSTRAINT "privacy_findings_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_jurisdiction_rules" ADD CONSTRAINT "website_jurisdiction_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_jurisdiction_rules" ADD CONSTRAINT "website_jurisdiction_rules_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_jurisdiction_rules" ADD CONSTRAINT "website_jurisdiction_rules_policy_id_consent_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."consent_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_scan_schedules" ADD CONSTRAINT "website_scan_schedules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_scan_schedules" ADD CONSTRAINT "website_scan_schedules_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_scan_schedules" ADD CONSTRAINT "website_scan_schedules_last_scan_id_scans_id_fk" FOREIGN KEY ("last_scan_id") REFERENCES "public"."scans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dpr_organization_idx" ON "data_principal_requests" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "dpr_website_idx" ON "data_principal_requests" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "dpr_status_idx" ON "data_principal_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dpr_due_at_idx" ON "data_principal_requests" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "dpr_received_at_idx" ON "data_principal_requests" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "dpr_requester_email_idx" ON "data_principal_requests" USING btree ("requester_email");--> statement-breakpoint
CREATE INDEX "privacy_findings_organization_idx" ON "privacy_findings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "privacy_findings_website_idx" ON "privacy_findings" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "privacy_findings_status_idx" ON "privacy_findings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "privacy_findings_severity_idx" ON "privacy_findings" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "privacy_findings_type_idx" ON "privacy_findings" USING btree ("finding_type");--> statement-breakpoint
CREATE INDEX "website_jurisdiction_rules_organization_idx" ON "website_jurisdiction_rules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "website_jurisdiction_rules_website_idx" ON "website_jurisdiction_rules" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "website_scan_schedules_org_idx" ON "website_scan_schedules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "website_scan_schedules_due_idx" ON "website_scan_schedules" USING btree ("enabled","next_scan_at");--> statement-breakpoint
CREATE INDEX "consent_records_org_created_idx" ON "consent_records" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "scan_results_scan_id_idx" ON "scan_results" USING btree ("scan_id");--> statement-breakpoint
CREATE INDEX "scan_results_scan_page_idx" ON "scan_results" USING btree ("scan_id","page_url");