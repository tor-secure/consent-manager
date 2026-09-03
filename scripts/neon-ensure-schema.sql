-- Idempotent schema patch for Neon / production.
-- Adds columns and tables the app expects that older databases may be missing.
-- Safe to run more than once (IF NOT EXISTS).
--
-- Neon: SQL Editor → paste this file → Run.
-- CLI:  DATABASE_URL="postgresql://..." npx tsx scripts/ensure-schema.ts

ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "dpo_name" varchar(255),
  ADD COLUMN IF NOT EXISTS "dpo_email" varchar(320),
  ADD COLUMN IF NOT EXISTS "grievance_officer_name" varchar(255),
  ADD COLUMN IF NOT EXISTS "grievance_officer_email" varchar(320),
  ADD COLUMN IF NOT EXISTS "grievance_portal_url" text;

ALTER TABLE "purposes"
  ADD COLUMN IF NOT EXISTS "data_categories" text[],
  ADD COLUMN IF NOT EXISTS "retention_period" varchar(255),
  ADD COLUMN IF NOT EXISTS "legal_basis" varchar(50);

ALTER TABLE "websites"
  ADD COLUMN IF NOT EXISTS "default_regulation_key" varchar(32),
  ADD COLUMN IF NOT EXISTS "consent_integrations" jsonb DEFAULT '{}'::jsonb NOT NULL;

ALTER TABLE "scan_results"
  ADD COLUMN IF NOT EXISTS "page_url" varchar(2048);

ALTER TABLE "scans"
  ADD COLUMN IF NOT EXISTS "triggered_by" varchar(20) DEFAULT 'manual' NOT NULL;

CREATE TABLE IF NOT EXISTS "data_principal_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "website_id" uuid REFERENCES "websites"("id") ON DELETE SET NULL,
  "request_type" varchar(50) NOT NULL,
  "status" varchar(50) NOT NULL DEFAULT 'received',
  "requester_name" varchar(255) NOT NULL,
  "requester_email" varchar(320) NOT NULL,
  "requester_phone" varchar(50),
  "consent_id" varchar(255),
  "description" text NOT NULL,
  "response_notes" text,
  "acknowledge_by" timestamptz NOT NULL,
  "due_at" timestamptz NOT NULL,
  "acknowledged_at" timestamptz,
  "completed_at" timestamptz,
  "received_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "dpr_organization_idx" ON "data_principal_requests" ("organization_id");
CREATE INDEX IF NOT EXISTS "dpr_website_idx" ON "data_principal_requests" ("website_id");
CREATE INDEX IF NOT EXISTS "dpr_status_idx" ON "data_principal_requests" ("status");
CREATE INDEX IF NOT EXISTS "dpr_due_at_idx" ON "data_principal_requests" ("due_at");
CREATE INDEX IF NOT EXISTS "dpr_received_at_idx" ON "data_principal_requests" ("received_at");
CREATE INDEX IF NOT EXISTS "dpr_requester_email_idx" ON "data_principal_requests" ("requester_email");

CREATE TABLE IF NOT EXISTS "privacy_findings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "website_id" uuid NOT NULL REFERENCES "websites"("id") ON DELETE CASCADE,
  "finding_type" varchar(80) NOT NULL,
  "severity" varchar(20) NOT NULL,
  "status" varchar(20) DEFAULT 'open' NOT NULL,
  "tracker_id" uuid REFERENCES "trackers"("id") ON DELETE SET NULL,
  "vendor_id" uuid REFERENCES "vendors"("id") ON DELETE SET NULL,
  "purpose_id" uuid REFERENCES "purposes"("id") ON DELETE SET NULL,
  "fingerprint" varchar(64) NOT NULL,
  "title" varchar(255) NOT NULL,
  "details" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "first_detected_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_detected_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_scan_id" uuid REFERENCES "scans"("id") ON DELETE SET NULL,
  "reviewed_at" timestamp with time zone,
  "reviewed_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "resolved_at" timestamp with time zone,
  "resolved_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "privacy_findings"
    ADD CONSTRAINT "privacy_findings_org_fingerprint_unique" UNIQUE ("organization_id", "fingerprint");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "privacy_findings_organization_idx" ON "privacy_findings" ("organization_id");
CREATE INDEX IF NOT EXISTS "privacy_findings_website_idx" ON "privacy_findings" ("website_id");
CREATE INDEX IF NOT EXISTS "privacy_findings_status_idx" ON "privacy_findings" ("status");
CREATE INDEX IF NOT EXISTS "privacy_findings_severity_idx" ON "privacy_findings" ("severity");
CREATE INDEX IF NOT EXISTS "privacy_findings_type_idx" ON "privacy_findings" ("finding_type");

CREATE INDEX IF NOT EXISTS "scan_results_scan_id_idx" ON "scan_results" ("scan_id");
CREATE INDEX IF NOT EXISTS "scan_results_scan_page_idx" ON "scan_results" ("scan_id", "page_url");

CREATE TABLE IF NOT EXISTS "website_jurisdiction_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "website_id" uuid NOT NULL REFERENCES "websites"("id") ON DELETE CASCADE,
  "country_code" varchar(2) NOT NULL,
  "region_code" varchar(16) DEFAULT '' NOT NULL,
  "policy_id" uuid NOT NULL REFERENCES "consent_policies"("id") ON DELETE CASCADE,
  "regulation_key" varchar(32) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "website_jurisdiction_rules"
    ADD CONSTRAINT "website_jurisdiction_rules_site_geo_unique"
    UNIQUE ("website_id", "country_code", "region_code");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "website_jurisdiction_rules_organization_idx"
  ON "website_jurisdiction_rules" ("organization_id");
CREATE INDEX IF NOT EXISTS "website_jurisdiction_rules_website_idx"
  ON "website_jurisdiction_rules" ("website_id");

CREATE INDEX IF NOT EXISTS "scans_website_status_idx"
  ON "scans" ("website_id", "status");

CREATE TABLE IF NOT EXISTS "website_scan_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "website_id" uuid NOT NULL REFERENCES "websites"("id") ON DELETE CASCADE,
  "enabled" boolean DEFAULT false NOT NULL,
  "frequency" varchar(20) DEFAULT 'weekly' NOT NULL,
  "timezone" varchar(100) DEFAULT 'UTC' NOT NULL,
  "next_scan_at" timestamp with time zone,
  "last_scan_at" timestamp with time zone,
  "last_scan_status" varchar(50),
  "last_scan_id" uuid REFERENCES "scans"("id") ON DELETE SET NULL,
  "last_error" text,
  "consecutive_failures" integer DEFAULT 0 NOT NULL,
  "locked_until" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "website_scan_schedules"
    ADD CONSTRAINT "website_scan_schedules_website_unique"
    UNIQUE ("website_id");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "website_scan_schedules_org_idx"
  ON "website_scan_schedules" ("organization_id");
CREATE INDEX IF NOT EXISTS "website_scan_schedules_due_idx"
  ON "website_scan_schedules" ("enabled", "next_scan_at");

CREATE INDEX IF NOT EXISTS "consent_records_org_created_idx"
  ON "consent_records" ("organization_id", "created_at");
