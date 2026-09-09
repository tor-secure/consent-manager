CREATE TABLE "consent_evidence_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"policy_version_id" uuid NOT NULL,
	"policy_version_number" integer NOT NULL,
	"consent_record_id" uuid NOT NULL,
	"consent_id" varchar(255) NOT NULL,
	"policy_context_id" uuid NOT NULL,
	"jurisdiction" varchar(100) NOT NULL,
	"locale" varchar(35) NOT NULL,
	"notice_hash" varchar(64) NOT NULL,
	"choice" varchar(20) NOT NULL,
	"status" varchar(50) NOT NULL,
	"source" varchar(50) DEFAULT 'web' NOT NULL,
	"policy_context" jsonb NOT NULL,
	"notice_snapshot" jsonb NOT NULL,
	"decisions" jsonb NOT NULL,
	"evidence_hash" varchar(64) NOT NULL,
	"evidence_signature" varchar(64) NOT NULL,
	"consented_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consent_evidence_snapshots" ADD CONSTRAINT "consent_evidence_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_evidence_snapshots" ADD CONSTRAINT "consent_evidence_snapshots_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_evidence_snapshots" ADD CONSTRAINT "consent_evidence_snapshots_policy_id_consent_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."consent_policies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_evidence_snapshots" ADD CONSTRAINT "consent_evidence_snapshots_policy_version_id_consent_policy_versions_id_fk" FOREIGN KEY ("policy_version_id") REFERENCES "public"."consent_policy_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consent_evidence_org_consent_idx" ON "consent_evidence_snapshots" USING btree ("organization_id","consent_id","consented_at");--> statement-breakpoint
CREATE INDEX "consent_evidence_record_idx" ON "consent_evidence_snapshots" USING btree ("consent_record_id");--> statement-breakpoint
CREATE INDEX "consent_evidence_context_idx" ON "consent_evidence_snapshots" USING btree ("policy_context_id");--> statement-breakpoint
CREATE INDEX "consent_evidence_policy_version_idx" ON "consent_evidence_snapshots" USING btree ("policy_version_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_consent_evidence_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'consent evidence snapshots are append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "consent_evidence_snapshots_immutable"
BEFORE UPDATE OR DELETE ON "consent_evidence_snapshots"
FOR EACH ROW EXECUTE FUNCTION prevent_consent_evidence_mutation();
