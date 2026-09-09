ALTER TABLE "consent_evidence_snapshots" ADD COLUMN "submission_id" uuid;--> statement-breakpoint
ALTER TABLE "consent_evidence_snapshots" ADD COLUMN "request_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "consent_evidence_snapshots" ADD COLUMN "signals" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "consent_evidence_snapshots"
SET
	"submission_id" = gen_random_uuid(),
	"request_hash" = repeat(md5("id"::text), 2)
WHERE "submission_id" IS NULL OR "request_hash" IS NULL;--> statement-breakpoint
ALTER TABLE "consent_evidence_snapshots" ALTER COLUMN "submission_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "consent_evidence_snapshots" ALTER COLUMN "request_hash" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "consent_evidence_snapshots" ADD CONSTRAINT "consent_evidence_snapshots_submission_id_unique" UNIQUE("submission_id");