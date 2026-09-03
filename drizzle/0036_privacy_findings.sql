-- ---------------------------------------------------------------------------
-- Migration: 0036_privacy_findings
--
-- Persists privacy/consent drift findings produced after a completed website
-- scan. Historical rows are never deleted; status moves open → reviewed →
-- resolved, and a resolved fingerprint can be reopened on later scans.
-- ---------------------------------------------------------------------------

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
