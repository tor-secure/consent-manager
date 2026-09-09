ALTER TABLE "consent_events" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "consent_events" ADD COLUMN "website_id" uuid;--> statement-breakpoint
ALTER TABLE "consent_events" ADD COLUMN "consent_id" varchar(255);--> statement-breakpoint
UPDATE "consent_events" AS e
SET
	"organization_id" = r."organization_id",
	"website_id" = r."website_id",
	"consent_id" = r."consent_id"
FROM "consent_records" AS r
WHERE e."consent_record_id" = r."id";--> statement-breakpoint
ALTER TABLE "consent_events" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "consent_events" ALTER COLUMN "website_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "consent_events" ALTER COLUMN "consent_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "consent_events" ALTER COLUMN "consent_record_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "consent_events" DROP CONSTRAINT "consent_events_consent_record_id_consent_records_id_fk";--> statement-breakpoint
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_consent_record_id_consent_records_id_fk" FOREIGN KEY ("consent_record_id") REFERENCES "public"."consent_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consent_events_org_consent_idx" ON "consent_events" USING btree ("organization_id","consent_id","occurred_at");--> statement-breakpoint
CREATE INDEX "consent_events_website_idx" ON "consent_events" USING btree ("website_id");--> statement-breakpoint
ALTER TABLE "consent_evidence_snapshots" ALTER COLUMN "consent_record_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "consent_evidence_snapshots" ADD COLUMN "variant_id" varchar(100);--> statement-breakpoint
UPDATE "consent_evidence_snapshots"
SET "variant_id" = NULLIF("policy_context"->>'variantId', '');--> statement-breakpoint
ALTER TABLE "portable_consent_exchanges" ALTER COLUMN "source_consent_record_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "portable_consent_exchanges" DROP CONSTRAINT "portable_consent_exchanges_source_consent_record_id_consent_records_id_fk";--> statement-breakpoint
ALTER TABLE "portable_consent_exchanges" ADD CONSTRAINT "portable_consent_exchanges_source_consent_record_id_consent_records_id_fk" FOREIGN KEY ("source_consent_record_id") REFERENCES "public"."consent_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "retention_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid,
	"resource_type" varchar(50) NOT NULL,
	"retention_days" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "retention_policies" ADD CONSTRAINT "retention_policies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_policies" ADD CONSTRAINT "retention_policies_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "retention_policies_org_idx" ON "retention_policies" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "retention_policies_org_resource_idx" ON "retention_policies" USING btree ("organization_id","resource_type");--> statement-breakpoint
CREATE UNIQUE INDEX "retention_policies_org_resource_unique" ON "retention_policies" ("organization_id","resource_type") WHERE "website_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "retention_policies_org_website_resource_unique" ON "retention_policies" ("organization_id","website_id","resource_type") WHERE "website_id" IS NOT NULL;--> statement-breakpoint
CREATE TABLE "legal_holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_by" uuid,
	"released_at" timestamp with time zone,
	"status" varchar(20) DEFAULT 'active' NOT NULL
);--> statement-breakpoint
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_released_by_users_id_fk" FOREIGN KEY ("released_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "legal_holds_org_idx" ON "legal_holds" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "legal_holds_resource_idx" ON "legal_holds" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "legal_holds_status_idx" ON "legal_holds" USING btree ("organization_id","status");--> statement-breakpoint
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
