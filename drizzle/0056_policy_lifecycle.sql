ALTER TABLE "consent_policy_versions"
  ADD COLUMN IF NOT EXISTS "scheduled_publish_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "consent_policy_versions"
  ADD COLUMN IF NOT EXISTS "unpublished_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "consent_policy_versions"
  ADD COLUMN IF NOT EXISTS "config_hash" varchar(64);
--> statement-breakpoint
ALTER TABLE "consent_policies"
  ADD COLUMN IF NOT EXISTS "live_version_id" uuid;
--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "consent_policy_versions_one_published"
  ON "consent_policy_versions" ("policy_id")
  WHERE "is_published" = true;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consent_policy_versions_scheduled_idx"
  ON "consent_policy_versions" ("scheduled_publish_at")
  WHERE "status" = 'scheduled';
