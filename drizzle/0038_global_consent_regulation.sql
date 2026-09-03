-- ---------------------------------------------------------------------------
-- Migration: 0038_global_consent_regulation
--
-- Website-level default regulation + consent integrations JSON, and
-- jurisdiction rules that point at existing consent policies (no policy
-- duplication per region).
-- ---------------------------------------------------------------------------

ALTER TABLE "websites"
  ADD COLUMN IF NOT EXISTS "default_regulation_key" varchar(32);

ALTER TABLE "websites"
  ADD COLUMN IF NOT EXISTS "consent_integrations" jsonb DEFAULT '{}'::jsonb NOT NULL;

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
