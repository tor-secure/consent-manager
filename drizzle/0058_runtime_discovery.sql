CREATE TABLE "runtime_discovery_observations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "website_id" uuid NOT NULL REFERENCES "websites"("id") ON DELETE cascade,
  "tracker_id" uuid REFERENCES "trackers"("id") ON DELETE set null,
  "vendor_id" uuid REFERENCES "vendors"("id") ON DELETE set null,
  "purpose_id" uuid REFERENCES "purposes"("id") ON DELETE set null,
  "event_id" varchar(64) NOT NULL,
  "observation_type" varchar(32) NOT NULL,
  "evidence_status" varchar(16) DEFAULT 'observed' NOT NULL,
  "discovery_source" varchar(80) DEFAULT 'cmp_sdk_runtime' NOT NULL,
  "page_url" varchar(512) NOT NULL, "page_origin" varchar(253) NOT NULL,
  "destination_host" varchar(253), "resource_path" varchar(512), "resource_type" varchar(32),
  "request_method" varchar(12), "initiator" varchar(512), "party" varchar(16) DEFAULT 'unknown' NOT NULL,
  "navigation_type" varchar(32), "storage_key" varchar(255), "consent_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "sanitization_status" varchar(16) DEFAULT 'sanitized' NOT NULL, "confidence" integer DEFAULT 100 NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL, "observed_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "runtime_discovery_site_event_unique" UNIQUE("website_id", "event_id")
);
CREATE INDEX "runtime_discovery_org_observed_idx" ON "runtime_discovery_observations" ("organization_id","observed_at");
CREATE INDEX "runtime_discovery_site_page_idx" ON "runtime_discovery_observations" ("website_id","page_url");
CREATE INDEX "runtime_discovery_destination_idx" ON "runtime_discovery_observations" ("website_id","destination_host");
