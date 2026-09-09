ALTER TABLE "consent_records" ADD COLUMN "state_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "consent_evidence_snapshots" ADD COLUMN "state_version" integer;--> statement-breakpoint
UPDATE "consent_evidence_snapshots" AS evidence
SET "state_version" = COALESCE(records."state_version", 1)
FROM "consent_records" AS records
WHERE records."id" = evidence."consent_record_id";--> statement-breakpoint
UPDATE "consent_evidence_snapshots"
SET "state_version" = 1
WHERE "state_version" IS NULL;--> statement-breakpoint
ALTER TABLE "consent_evidence_snapshots" ALTER COLUMN "state_version" SET NOT NULL;