-- ---------------------------------------------------------------------------
-- Migration: 0039_continuous_scanner_analytics
--
-- Per-website scan schedules, scan trigger metadata, and an org+created
-- index used by consent analytics aggregations.
-- ---------------------------------------------------------------------------

ALTER TABLE "scans"
  ADD COLUMN IF NOT EXISTS "triggered_by" varchar(20) DEFAULT 'manual' NOT NULL;

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
