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
  WHEN duplicate_table THEN NULL;
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
  WHEN duplicate_table THEN NULL;
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
  WHEN duplicate_table THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "website_scan_schedules_org_idx"
  ON "website_scan_schedules" ("organization_id");
CREATE INDEX IF NOT EXISTS "website_scan_schedules_due_idx"
  ON "website_scan_schedules" ("enabled", "next_scan_at");

CREATE INDEX IF NOT EXISTS "consent_records_org_created_idx"
  ON "consent_records" ("organization_id", "created_at");

-- ── 0042–0051 additive sync (evidence, trackers, intelligence, retention) ──
-- See scripts/apply-pending-schema.sql for the standalone copy.

ALTER TABLE "consent_records"
  ADD COLUMN IF NOT EXISTS "state_version" integer DEFAULT 1 NOT NULL;

ALTER TABLE "api_keys"
  ADD COLUMN IF NOT EXISTS "scopes" text[] DEFAULT ARRAY['consent:evaluate','data:redact']::text[] NOT NULL;

ALTER TABLE "websites"
  ADD COLUMN IF NOT EXISTS "iab_registration" jsonb,
  ADD COLUMN IF NOT EXISTS "iab_mapping" jsonb;

ALTER TABLE "purposes"
  ADD COLUMN IF NOT EXISTS "iab_tcf_purpose_id" integer,
  ADD COLUMN IF NOT EXISTS "iab_gpp_purpose_id" integer;

ALTER TABLE "vendors"
  ADD COLUMN IF NOT EXISTS "iab_vendor_id" integer;

DO $$ BEGIN
  ALTER TABLE "purposes"
    ADD CONSTRAINT "purposes_iab_tcf_id_range"
    CHECK ("iab_tcf_purpose_id" is null or ("iab_tcf_purpose_id" between 1 and 24));
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "vendors"
    ADD CONSTRAINT "vendors_iab_vendor_id_range"
    CHECK ("iab_vendor_id" is null or ("iab_vendor_id" between 1 and 65535));
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_table THEN NULL;
END $$;

ALTER TABLE "trackers"
  ADD COLUMN IF NOT EXISTS "category" varchar(100),
  ADD COLUMN IF NOT EXISTS "cookie_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "storage_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "local_storage_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "session_storage_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "indexed_db_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "script_url_patterns" jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "iframe_url_patterns" jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "pixel_url_patterns" jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "scanner_classification" varchar(30) DEFAULT 'unmapped' NOT NULL,
  ADD COLUMN IF NOT EXISTS "party" varchar(20) DEFAULT 'unknown' NOT NULL,
  ADD COLUMN IF NOT EXISTS "duration" varchar(255),
  ADD COLUMN IF NOT EXISTS "deletion_behavior" text;

CREATE TABLE IF NOT EXISTS "consent_evidence_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
  "website_id" uuid NOT NULL REFERENCES "websites"("id") ON DELETE RESTRICT,
  "policy_id" uuid NOT NULL REFERENCES "consent_policies"("id") ON DELETE RESTRICT,
  "policy_version_id" uuid NOT NULL REFERENCES "consent_policy_versions"("id") ON DELETE RESTRICT,
  "policy_version_number" integer NOT NULL,
  "consent_record_id" uuid,
  "consent_id" varchar(255) NOT NULL,
  "submission_id" uuid NOT NULL UNIQUE,
  "request_hash" varchar(64) NOT NULL,
  "policy_context_id" uuid NOT NULL,
  "jurisdiction" varchar(100) NOT NULL,
  "locale" varchar(35) NOT NULL,
  "variant_id" varchar(100),
  "notice_hash" varchar(64) NOT NULL,
  "choice" varchar(20) NOT NULL,
  "status" varchar(50) NOT NULL,
  "state_version" integer NOT NULL,
  "source" varchar(50) DEFAULT 'web' NOT NULL,
  "policy_context" jsonb NOT NULL,
  "notice_snapshot" jsonb NOT NULL,
  "decisions" jsonb NOT NULL,
  "signals" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "evidence_hash" varchar(64) NOT NULL,
  "evidence_signature" varchar(64) NOT NULL,
  "consented_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "consent_evidence_org_consent_idx"
  ON "consent_evidence_snapshots" ("organization_id", "consent_id", "consented_at");
CREATE INDEX IF NOT EXISTS "consent_evidence_record_idx"
  ON "consent_evidence_snapshots" ("consent_record_id");
CREATE INDEX IF NOT EXISTS "consent_evidence_context_idx"
  ON "consent_evidence_snapshots" ("policy_context_id");
CREATE INDEX IF NOT EXISTS "consent_evidence_policy_version_idx"
  ON "consent_evidence_snapshots" ("policy_version_id");

CREATE OR REPLACE FUNCTION prevent_consent_evidence_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE'
    AND current_setting('app.allow_evidence_retention_delete', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'consent evidence snapshots are append-only';
END;
$$;

DROP TRIGGER IF EXISTS "consent_evidence_snapshots_immutable" ON "consent_evidence_snapshots";
CREATE TRIGGER "consent_evidence_snapshots_immutable"
BEFORE UPDATE OR DELETE ON "consent_evidence_snapshots"
FOR EACH ROW EXECUTE FUNCTION prevent_consent_evidence_mutation();

CREATE TABLE IF NOT EXISTS "portable_consent_exchanges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "jti" uuid NOT NULL UNIQUE,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "source_website_id" uuid NOT NULL REFERENCES "websites"("id") ON DELETE CASCADE,
  "target_website_id" uuid NOT NULL REFERENCES "websites"("id") ON DELETE CASCADE,
  "source_consent_record_id" uuid REFERENCES "consent_records"("id") ON DELETE SET NULL,
  "imported_consent_record_id" uuid REFERENCES "consent_records"("id") ON DELETE SET NULL,
  "token_hash" text NOT NULL UNIQUE,
  "code_hash" text NOT NULL UNIQUE,
  "claims" jsonb NOT NULL,
  "status" varchar(20) DEFAULT 'issued' NOT NULL,
  "issued_at" timestamp with time zone NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "portable_consent_exchanges_org_idx"
  ON "portable_consent_exchanges" ("organization_id");
CREATE INDEX IF NOT EXISTS "portable_consent_exchanges_expiry_idx"
  ON "portable_consent_exchanges" ("expires_at");

CREATE TABLE IF NOT EXISTS "retention_policies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
  "website_id" uuid REFERENCES "websites"("id") ON DELETE SET NULL,
  "resource_type" varchar(50) NOT NULL,
  "retention_days" integer NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "retention_policies_org_idx"
  ON "retention_policies" ("organization_id");
CREATE INDEX IF NOT EXISTS "retention_policies_org_resource_idx"
  ON "retention_policies" ("organization_id", "resource_type");
CREATE UNIQUE INDEX IF NOT EXISTS "retention_policies_org_resource_unique"
  ON "retention_policies" ("organization_id", "resource_type")
  WHERE "website_id" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "retention_policies_org_website_resource_unique"
  ON "retention_policies" ("organization_id", "website_id", "resource_type")
  WHERE "website_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "legal_holds" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
  "website_id" uuid REFERENCES "websites"("id") ON DELETE SET NULL,
  "resource_type" varchar(50) NOT NULL,
  "resource_id" uuid NOT NULL,
  "reason" text NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "released_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "released_at" timestamp with time zone,
  "status" varchar(20) DEFAULT 'active' NOT NULL
);

CREATE INDEX IF NOT EXISTS "legal_holds_org_idx" ON "legal_holds" ("organization_id");
CREATE INDEX IF NOT EXISTS "legal_holds_resource_idx" ON "legal_holds" ("resource_type", "resource_id");
CREATE INDEX IF NOT EXISTS "legal_holds_status_idx" ON "legal_holds" ("organization_id", "status");

CREATE TABLE IF NOT EXISTS "iab_gvl_cache" (
  "version" integer PRIMARY KEY NOT NULL,
  "specification_version" integer NOT NULL,
  "tcf_policy_version" integer NOT NULL,
  "source_url" text NOT NULL,
  "sha256" varchar(64) NOT NULL,
  "payload" jsonb NOT NULL,
  "status" varchar(24) DEFAULT 'current' NOT NULL,
  "fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
  "validated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "iab_gvl_cache_status_idx" ON "iab_gvl_cache" ("status");
CREATE INDEX IF NOT EXISTS "iab_gvl_cache_fetched_idx" ON "iab_gvl_cache" ("fetched_at");

CREATE TABLE IF NOT EXISTS "intelligence_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "website_id" uuid REFERENCES "websites"("id") ON DELETE CASCADE,
  "actor_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "engine" varchar(50) NOT NULL,
  "input_fingerprint" varchar(64) NOT NULL,
  "provider" varchar(100) NOT NULL,
  "provider_model" varchar(255),
  "fallback" boolean NOT NULL,
  "deterministic_output" jsonb NOT NULL,
  "ai_enrichment" jsonb NOT NULL,
  "usage" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "intelligence_runs_org_site_created_idx"
  ON "intelligence_runs" ("organization_id", "website_id", "created_at");
CREATE INDEX IF NOT EXISTS "intelligence_runs_fingerprint_idx"
  ON "intelligence_runs" ("input_fingerprint");

CREATE TABLE IF NOT EXISTS "digital_twin_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "website_id" uuid NOT NULL REFERENCES "websites"("id") ON DELETE CASCADE,
  "source" varchar(30) NOT NULL,
  "source_id" uuid,
  "graph_hash" varchar(64) NOT NULL,
  "quality_score" integer,
  "input_payload" jsonb NOT NULL,
  "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "digital_twin_site_created_idx"
  ON "digital_twin_snapshots" ("organization_id", "website_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "digital_twin_source_unique"
  ON "digital_twin_snapshots" ("website_id", "source", "source_id");

CREATE TABLE IF NOT EXISTS "autopilot_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "website_id" uuid NOT NULL REFERENCES "websites"("id") ON DELETE CASCADE,
  "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "status" varchar(30) DEFAULT 'draft' NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "baseline_fingerprint" varchar(64) NOT NULL,
  "plan" jsonb NOT NULL,
  "rollback_state" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "autopilot_plans_site_idx"
  ON "autopilot_plans" ("organization_id", "website_id", "created_at");

CREATE TABLE IF NOT EXISTS "roi_configurations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "website_id" uuid REFERENCES "websites"("id") ON DELETE CASCADE,
  "monthly_sessions" integer,
  "value_per_conversion" double precision,
  "value_per_consent" double precision,
  "implementation_cost" double precision,
  "recurring_monthly_cost" double precision,
  "currency" varchar(3) DEFAULT 'USD' NOT NULL,
  "target_score" integer DEFAULT 85 NOT NULL,
  "updated_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "roi_configuration_scope_unique"
  ON "roi_configurations" ("organization_id", "website_id");

CREATE TABLE IF NOT EXISTS "negotiation_configurations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "website_id" uuid NOT NULL REFERENCES "websites"("id") ON DELETE CASCADE,
  "enabled" boolean DEFAULT false NOT NULL,
  "offers" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "constraints" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "updated_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "negotiation_configuration_site_unique"
  ON "negotiation_configurations" ("website_id");

CREATE TABLE IF NOT EXISTS "negotiation_outcomes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "website_id" uuid NOT NULL REFERENCES "websites"("id") ON DELETE CASCADE,
  "offer_key" varchar(100) NOT NULL,
  "outcome" varchar(30) NOT NULL,
  "purpose_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "negotiation_outcomes_site_time_idx"
  ON "negotiation_outcomes" ("organization_id", "website_id", "occurred_at");

ALTER TABLE "consent_events"
  ADD COLUMN IF NOT EXISTS "organization_id" uuid,
  ADD COLUMN IF NOT EXISTS "website_id" uuid,
  ADD COLUMN IF NOT EXISTS "consent_id" varchar(255);

UPDATE "consent_events" AS e
SET
  "organization_id" = r."organization_id",
  "website_id" = r."website_id",
  "consent_id" = r."consent_id"
FROM "consent_records" AS r
WHERE e."consent_record_id" = r."id"
  AND (
    e."organization_id" IS NULL
    OR e."website_id" IS NULL
    OR e."consent_id" IS NULL
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "consent_events"
    WHERE "organization_id" IS NULL OR "website_id" IS NULL OR "consent_id" IS NULL
  ) THEN
    ALTER TABLE "consent_events" ALTER COLUMN "organization_id" SET NOT NULL;
    ALTER TABLE "consent_events" ALTER COLUMN "website_id" SET NOT NULL;
    ALTER TABLE "consent_events" ALTER COLUMN "consent_id" SET NOT NULL;
  END IF;
END $$;

ALTER TABLE "consent_events" ALTER COLUMN "consent_record_id" DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE "consent_events"
    ADD CONSTRAINT "consent_events_organization_id_organizations_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "consent_events"
    ADD CONSTRAINT "consent_events_website_id_websites_id_fk"
    FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "consent_events"
    ADD CONSTRAINT "consent_events_consent_record_id_consent_records_id_fk"
    FOREIGN KEY ("consent_record_id") REFERENCES "consent_records"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "websites"
    ADD CONSTRAINT "websites_organization_domain_unique" UNIQUE ("organization_id", "domain");
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_table THEN NULL;
  WHEN unique_violation THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "consent_events_org_consent_idx"
  ON "consent_events" ("organization_id", "consent_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "consent_events_website_idx"
  ON "consent_events" ("website_id");

ALTER TABLE "data_principal_requests"
  ADD COLUMN IF NOT EXISTS "jurisdiction" varchar(32) DEFAULT 'dpdp' NOT NULL,
  ADD COLUMN IF NOT EXISTS "jurisdiction_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "requester_reference" varchar(32),
  ADD COLUMN IF NOT EXISTS "requester_kind" varchar(30) DEFAULT 'direct_requester' NOT NULL,
  ADD COLUMN IF NOT EXISTS "agent_authorization_note" text,
  ADD COLUMN IF NOT EXISTS "verification_status" varchar(40) DEFAULT 'unverified' NOT NULL,
  ADD COLUMN IF NOT EXISTS "verification_method" varchar(40),
  ADD COLUMN IF NOT EXISTS "verification_expires_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "verified_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "assigned_to" uuid,
  ADD COLUMN IF NOT EXISTS "deadline_kind" varchar(40) DEFAULT 'legacy_dpdp_default' NOT NULL,
  ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "outcome" jsonb DEFAULT '{}'::jsonb NOT NULL;

UPDATE "data_principal_requests"
SET "requester_reference" = 'RR' || upper(substr(replace(id::text, '-', ''), 1, 10))
WHERE "requester_reference" IS NULL;

DO $$ BEGIN
  ALTER TABLE "data_principal_requests"
    ADD CONSTRAINT "data_principal_requests_assigned_to_users_id_fk"
    FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_table THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "dpr_requester_reference_unique"
  ON "data_principal_requests" ("requester_reference");
CREATE INDEX IF NOT EXISTS "dpr_verification_status_idx"
  ON "data_principal_requests" ("verification_status");
CREATE INDEX IF NOT EXISTS "dpr_jurisdiction_idx"
  ON "data_principal_requests" ("jurisdiction");

CREATE TABLE IF NOT EXISTS "rights_request_verifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "request_id" uuid NOT NULL REFERENCES "data_principal_requests"("id") ON DELETE CASCADE,
  "purpose" varchar(30) NOT NULL,
  "token_hash" varchar(64) NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "failed_attempts" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "rights_verifications_org_idx"
  ON "rights_request_verifications" ("organization_id");
CREATE INDEX IF NOT EXISTS "rights_verifications_request_idx"
  ON "rights_request_verifications" ("request_id");
CREATE INDEX IF NOT EXISTS "rights_verifications_hash_idx"
  ON "rights_request_verifications" ("token_hash");

CREATE TABLE IF NOT EXISTS "rights_request_exports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "request_id" uuid NOT NULL REFERENCES "data_principal_requests"("id") ON DELETE CASCADE,
  "export_kind" varchar(30) NOT NULL,
  "payload" jsonb NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "accessed_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "rights_exports_org_idx"
  ON "rights_request_exports" ("organization_id");
CREATE INDEX IF NOT EXISTS "rights_exports_request_idx"
  ON "rights_request_exports" ("request_id");
CREATE INDEX IF NOT EXISTS "rights_exports_expiry_idx"
  ON "rights_request_exports" ("expires_at");

ALTER TABLE "websites"
  ADD COLUMN IF NOT EXISTS "child_protection" jsonb DEFAULT '{}'::jsonb NOT NULL;

CREATE TABLE IF NOT EXISTS "age_assurance_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "website_id" uuid NOT NULL REFERENCES "websites"("id") ON DELETE CASCADE,
  "consent_id" varchar(255),
  "age_status" varchar(40) DEFAULT 'unknown' NOT NULL,
  "age_band" varchar(20) DEFAULT 'unknown' NOT NULL,
  "assurance_method" varchar(40),
  "asserted_over_threshold" boolean,
  "guardian_required" boolean DEFAULT false NOT NULL,
  "guardian_status" varchar(40) DEFAULT 'none' NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "age_sessions_org_idx"
  ON "age_assurance_sessions" ("organization_id");
CREATE INDEX IF NOT EXISTS "age_sessions_website_idx"
  ON "age_assurance_sessions" ("website_id");
CREATE INDEX IF NOT EXISTS "age_sessions_consent_idx"
  ON "age_assurance_sessions" ("consent_id");

CREATE TABLE IF NOT EXISTS "guardian_authorization_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "website_id" uuid NOT NULL REFERENCES "websites"("id") ON DELETE CASCADE,
  "session_id" uuid NOT NULL REFERENCES "age_assurance_sessions"("id") ON DELETE CASCADE,
  "purpose" varchar(30) NOT NULL,
  "token_hash" varchar(64) NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "failed_attempts" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "guardian_requests_org_idx"
  ON "guardian_authorization_requests" ("organization_id");
CREATE INDEX IF NOT EXISTS "guardian_requests_session_idx"
  ON "guardian_authorization_requests" ("session_id");

ALTER TABLE "consent_policy_versions"
  ADD COLUMN IF NOT EXISTS "processing_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "consent_policy_versions"
  ADD COLUMN IF NOT EXISTS "scheduled_publish_at" timestamp with time zone;
ALTER TABLE "consent_policy_versions"
  ADD COLUMN IF NOT EXISTS "unpublished_at" timestamp with time zone;
ALTER TABLE "consent_policy_versions"
  ADD COLUMN IF NOT EXISTS "config_hash" varchar(64);
ALTER TABLE "consent_policies"
  ADD COLUMN IF NOT EXISTS "live_version_id" uuid;
UPDATE "consent_policy_versions" AS v
SET "is_published" = false,
    "status" = 'archived',
    "unpublished_at" = NOW()
WHERE v."is_published" = true
  AND v."id" NOT IN (
    SELECT DISTINCT ON ("policy_id") "id"
    FROM "consent_policy_versions"
    WHERE "is_published" = true
    ORDER BY "policy_id", "version" DESC
  );
CREATE UNIQUE INDEX IF NOT EXISTS "consent_policy_versions_one_published"
  ON "consent_policy_versions" ("policy_id")
  WHERE "is_published" = true;
ALTER TABLE "vendor_purposes"
  ADD COLUMN IF NOT EXISTS "processing_role" varchar(40);
ALTER TABLE "vendor_purposes"
  ADD COLUMN IF NOT EXISTS "status" varchar(40) DEFAULT 'active' NOT NULL;
ALTER TABLE "vendors"
  ADD COLUMN IF NOT EXISTS "legal_name" varchar(255);
ALTER TABLE "vendors"
  ADD COLUMN IF NOT EXISTS "role" varchar(40) DEFAULT 'unknown' NOT NULL;
ALTER TABLE "vendors"
  ADD COLUMN IF NOT EXISTS "processing_countries" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "vendors"
  ADD COLUMN IF NOT EXISTS "dpa_status" varchar(40) DEFAULT 'not_configured' NOT NULL;
ALTER TABLE "vendors"
  ADD COLUMN IF NOT EXISTS "dpa_effective_at" timestamp with time zone;
ALTER TABLE "vendors"
  ADD COLUMN IF NOT EXISTS "dpa_review_at" timestamp with time zone;
ALTER TABLE "vendors"
  ADD COLUMN IF NOT EXISTS "dpa_reference" varchar(255);
ALTER TABLE "vendors"
  ADD COLUMN IF NOT EXISTS "downstream_dsar_mode" varchar(40) DEFAULT 'not_required' NOT NULL;

CREATE TABLE IF NOT EXISTS "processing_activities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "website_id" uuid REFERENCES "websites"("id") ON DELETE CASCADE,
  "vendor_id" uuid NOT NULL REFERENCES "vendors"("id") ON DELETE CASCADE,
  "purpose_id" uuid REFERENCES "purposes"("id") ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS "processing_activities_org_idx" ON "processing_activities" ("organization_id");
CREATE INDEX IF NOT EXISTS "processing_activities_website_idx" ON "processing_activities" ("website_id");
CREATE INDEX IF NOT EXISTS "processing_activities_vendor_idx" ON "processing_activities" ("vendor_id");

CREATE TABLE IF NOT EXISTS "vendor_relationships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "parent_vendor_id" uuid NOT NULL REFERENCES "vendors"("id") ON DELETE CASCADE,
  "child_vendor_id" uuid NOT NULL REFERENCES "vendors"("id") ON DELETE CASCADE,
  "relationship_type" varchar(40) NOT NULL,
  "status" varchar(40) DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "vendor_relationships_org_idx" ON "vendor_relationships" ("organization_id");
CREATE INDEX IF NOT EXISTS "vendor_relationships_parent_idx" ON "vendor_relationships" ("parent_vendor_id");
CREATE INDEX IF NOT EXISTS "vendor_relationships_child_idx" ON "vendor_relationships" ("child_vendor_id");

CREATE TABLE IF NOT EXISTS "cross_border_transfers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "website_id" uuid REFERENCES "websites"("id") ON DELETE CASCADE,
  "vendor_id" uuid NOT NULL REFERENCES "vendors"("id") ON DELETE CASCADE,
  "processing_activity_id" uuid REFERENCES "processing_activities"("id") ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS "transfers_org_idx" ON "cross_border_transfers" ("organization_id");
CREATE INDEX IF NOT EXISTS "transfers_website_idx" ON "cross_border_transfers" ("website_id");
CREATE INDEX IF NOT EXISTS "transfers_vendor_idx" ON "cross_border_transfers" ("vendor_id");

CREATE TABLE IF NOT EXISTS "rights_downstream_actions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "request_id" uuid NOT NULL REFERENCES "data_principal_requests"("id") ON DELETE CASCADE,
  "vendor_id" uuid NOT NULL REFERENCES "vendors"("id") ON DELETE RESTRICT,
  "processing_activity_id" uuid REFERENCES "processing_activities"("id") ON DELETE SET NULL,
  "action_required" boolean DEFAULT false NOT NULL,
  "status" varchar(40) DEFAULT 'not_required' NOT NULL,
  "reference" varchar(255),
  "requested_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "rights_downstream_org_idx" ON "rights_downstream_actions" ("organization_id");
CREATE INDEX IF NOT EXISTS "rights_downstream_request_idx" ON "rights_downstream_actions" ("request_id");
CREATE INDEX IF NOT EXISTS "rights_downstream_vendor_idx" ON "rights_downstream_actions" ("vendor_id");

CREATE TABLE IF NOT EXISTS "california_opt_out_states" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "website_id" uuid NOT NULL REFERENCES "websites"("id") ON DELETE CASCADE,
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
  "policy_version_id" uuid REFERENCES "consent_policy_versions"("id") ON DELETE SET NULL,
  "effective_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "california_opt_out_org_website_consent_unique" ON "california_opt_out_states" ("organization_id","website_id","consent_id");
CREATE INDEX IF NOT EXISTS "california_opt_out_org_idx" ON "california_opt_out_states" ("organization_id");
CREATE INDEX IF NOT EXISTS "california_opt_out_website_idx" ON "california_opt_out_states" ("website_id");
CREATE INDEX IF NOT EXISTS "california_opt_out_consent_idx" ON "california_opt_out_states" ("consent_id");
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "ccpa_sale" varchar(40) DEFAULT 'unknown' NOT NULL;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "ccpa_share" varchar(40) DEFAULT 'unknown' NOT NULL;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "ccpa_sensitive_pi" varchar(40) DEFAULT 'unknown' NOT NULL;
ALTER TABLE "trackers" ADD COLUMN IF NOT EXISTS "ccpa_sale" varchar(40) DEFAULT 'unknown' NOT NULL;
ALTER TABLE "trackers" ADD COLUMN IF NOT EXISTS "ccpa_share" varchar(40) DEFAULT 'unknown' NOT NULL;
ALTER TABLE "trackers" ADD COLUMN IF NOT EXISTS "ccpa_sensitive_pi" varchar(40) DEFAULT 'unknown' NOT NULL;
ALTER TABLE "processing_activities" ADD COLUMN IF NOT EXISTS "ccpa_sale" varchar(40) DEFAULT 'unknown' NOT NULL;
ALTER TABLE "processing_activities" ADD COLUMN IF NOT EXISTS "ccpa_share" varchar(40) DEFAULT 'unknown' NOT NULL;
ALTER TABLE "processing_activities" ADD COLUMN IF NOT EXISTS "ccpa_sensitive_pi" varchar(40) DEFAULT 'unknown' NOT NULL;

CREATE TABLE IF NOT EXISTS "inbound_webhooks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" varchar(50) NOT NULL,
  "event_id" varchar(255) NOT NULL,
  "event_type" varchar(120),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "inbound_webhooks_provider_event_unique" ON "inbound_webhooks" ("provider", "event_id");
CREATE INDEX IF NOT EXISTS "inbound_webhooks_created_idx" ON "inbound_webhooks" ("created_at");

CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
  "bucket_key" varchar(300) PRIMARY KEY NOT NULL,
  "hit_count" integer NOT NULL,
  "reset_at" timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS "rate_limit_buckets_reset_idx" ON "rate_limit_buckets" ("reset_at");


