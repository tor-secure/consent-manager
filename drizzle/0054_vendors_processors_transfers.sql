CREATE TABLE IF NOT EXISTS "cross_border_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid,
	"vendor_id" uuid NOT NULL,
	"processing_activity_id" uuid,
	"source_country" varchar(8),
	"destination_country" varchar(8),
	"destination_region" varchar(32),
	"destination_type" varchar(40) DEFAULT 'vendor' NOT NULL,
	"transfer_purpose" varchar(255),
	"data_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"processing_location" varchar(100),
	"mechanism" varchar(40) DEFAULT 'not_configured' NOT NULL,
	"safeguards" text,
	"documentation_ref" varchar(255),
	"notes" text,
	"effective_at" timestamp with time zone,
	"review_at" timestamp with time zone,
	"status" varchar(40) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processing_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid,
	"vendor_id" uuid NOT NULL,
	"purpose_id" uuid,
	"description" text,
	"data_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sensitive" boolean DEFAULT false NOT NULL,
	"source_of_data" varchar(255),
	"recipients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"retention_period" varchar(255),
	"processing_role" varchar(40) DEFAULT 'unknown' NOT NULL,
	"processing_location" varchar(100),
	"transfer_required" boolean DEFAULT false NOT NULL,
	"legal_basis" varchar(50),
	"status" varchar(40) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rights_downstream_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"processing_activity_id" uuid,
	"action_required" boolean DEFAULT false NOT NULL,
	"status" varchar(40) DEFAULT 'not_required' NOT NULL,
	"reference" varchar(255),
	"requested_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rights_downstream_request_vendor_unique" UNIQUE("request_id","vendor_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"parent_vendor_id" uuid NOT NULL,
	"child_vendor_id" uuid NOT NULL,
	"relationship_type" varchar(40) NOT NULL,
	"status" varchar(40) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendor_relationships_pair_unique" UNIQUE("organization_id","parent_vendor_id","child_vendor_id","relationship_type")
);
--> statement-breakpoint
ALTER TABLE "consent_policy_versions" ADD COLUMN IF NOT EXISTS "processing_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "vendor_purposes" ADD COLUMN IF NOT EXISTS "processing_role" varchar(40);--> statement-breakpoint
ALTER TABLE "vendor_purposes" ADD COLUMN IF NOT EXISTS "status" varchar(40) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "legal_name" varchar(255);--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "role" varchar(40) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "processing_countries" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "dpa_status" varchar(40) DEFAULT 'not_configured' NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "dpa_effective_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "dpa_review_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "dpa_reference" varchar(255);--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "downstream_dsar_mode" varchar(40) DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE "cross_border_transfers" ADD CONSTRAINT "cross_border_transfers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_border_transfers" ADD CONSTRAINT "cross_border_transfers_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_border_transfers" ADD CONSTRAINT "cross_border_transfers_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_border_transfers" ADD CONSTRAINT "cross_border_transfers_processing_activity_id_processing_activities_id_fk" FOREIGN KEY ("processing_activity_id") REFERENCES "public"."processing_activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_activities" ADD CONSTRAINT "processing_activities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_activities" ADD CONSTRAINT "processing_activities_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_activities" ADD CONSTRAINT "processing_activities_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_activities" ADD CONSTRAINT "processing_activities_purpose_id_purposes_id_fk" FOREIGN KEY ("purpose_id") REFERENCES "public"."purposes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rights_downstream_actions" ADD CONSTRAINT "rights_downstream_actions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rights_downstream_actions" ADD CONSTRAINT "rights_downstream_actions_request_id_data_principal_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."data_principal_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rights_downstream_actions" ADD CONSTRAINT "rights_downstream_actions_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rights_downstream_actions" ADD CONSTRAINT "rights_downstream_actions_processing_activity_id_processing_activities_id_fk" FOREIGN KEY ("processing_activity_id") REFERENCES "public"."processing_activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_relationships" ADD CONSTRAINT "vendor_relationships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_relationships" ADD CONSTRAINT "vendor_relationships_parent_vendor_id_vendors_id_fk" FOREIGN KEY ("parent_vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_relationships" ADD CONSTRAINT "vendor_relationships_child_vendor_id_vendors_id_fk" FOREIGN KEY ("child_vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfers_org_idx" ON "cross_border_transfers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfers_website_idx" ON "cross_border_transfers" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfers_vendor_idx" ON "cross_border_transfers" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processing_activities_org_idx" ON "processing_activities" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processing_activities_website_idx" ON "processing_activities" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processing_activities_vendor_idx" ON "processing_activities" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rights_downstream_org_idx" ON "rights_downstream_actions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rights_downstream_request_idx" ON "rights_downstream_actions" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rights_downstream_vendor_idx" ON "rights_downstream_actions" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vendor_relationships_org_idx" ON "vendor_relationships" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vendor_relationships_parent_idx" ON "vendor_relationships" USING btree ("parent_vendor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vendor_relationships_child_idx" ON "vendor_relationships" USING btree ("child_vendor_id");