-- ---------------------------------------------------------------------------
-- Migration: 0034_purpose_dpdp_enrichment
--
-- Adds three nullable columns to the purposes table required for DPDP 2023
-- compliance under Rules 2025 Rule 3(1)(b)+(c):
--
--   data_categories  text[]        — Array of personal data category labels
--                                    e.g. {"Email address","IP address"}
--   retention_period varchar(255)  — Human-readable retention string for the notice
--                                    e.g. "12 months", "Until account deletion"
--   legal_basis      varchar(50)   — Processing ground: consent | legitimate_interest |
--                                    legal_obligation | vital_interest | public_task
--
-- All columns are nullable so existing purpose rows remain valid.
-- The API and UI default legal_basis to "consent" for new purposes.
-- ---------------------------------------------------------------------------

ALTER TABLE "purposes"
  ADD COLUMN IF NOT EXISTS "data_categories"  text[],
  ADD COLUMN IF NOT EXISTS "retention_period" varchar(255),
  ADD COLUMN IF NOT EXISTS "legal_basis"      varchar(50);
