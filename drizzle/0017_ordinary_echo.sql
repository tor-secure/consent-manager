CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"policy_version_id" uuid NOT NULL,
	"consent_id" varchar(255) NOT NULL,
	"visitor_id" varchar(255),
	"jurisdiction" varchar(100),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"source" varchar(50) DEFAULT 'web' NOT NULL,
	"consented_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consent_records_consent_id_unique" UNIQUE("consent_id")
);
--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_policy_version_id_consent_policy_versions_id_fk" FOREIGN KEY ("policy_version_id") REFERENCES "public"."consent_policy_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consent_records_organization_idx" ON "consent_records" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "consent_records_website_idx" ON "consent_records" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "consent_records_policy_version_idx" ON "consent_records" USING btree ("policy_version_id");--> statement-breakpoint
CREATE INDEX "consent_records_visitor_idx" ON "consent_records" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "consent_records_created_at_idx" ON "consent_records" USING btree ("created_at");