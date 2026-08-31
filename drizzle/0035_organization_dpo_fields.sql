-- ---------------------------------------------------------------------------
-- Migration: 0035_organization_dpo_fields
--
-- Adds Data Protection Officer and Grievance Officer contact fields to the
-- organizations table, required by DPDP Rules 2025 Rule 3(1)(d).
--
-- The DPO/Grievance Officer contact details are included in the public
-- SDK config response so the consent banner can display the required
-- contact mechanism to visitors.
--
-- All columns are nullable — existing rows remain valid without any
-- data migration.
-- ---------------------------------------------------------------------------

ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "dpo_name"                varchar(255),
  ADD COLUMN IF NOT EXISTS "dpo_email"               varchar(320),
  ADD COLUMN IF NOT EXISTS "grievance_officer_name"  varchar(255),
  ADD COLUMN IF NOT EXISTS "grievance_officer_email" varchar(320),
  ADD COLUMN IF NOT EXISTS "grievance_portal_url"    text;
