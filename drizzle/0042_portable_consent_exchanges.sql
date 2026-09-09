CREATE TABLE IF NOT EXISTS "portable_consent_exchanges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jti" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"source_website_id" uuid NOT NULL,
	"target_website_id" uuid NOT NULL,
	"source_consent_record_id" uuid NOT NULL,
	"imported_consent_record_id" uuid,
	"token_hash" text NOT NULL,
	"code_hash" text NOT NULL,
	"claims" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'issued' NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portable_consent_exchanges_jti_unique" UNIQUE("jti"),
	CONSTRAINT "portable_consent_exchanges_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "portable_consent_exchanges_code_hash_unique" UNIQUE("code_hash")
);
--> statement-breakpoint
ALTER TABLE "portable_consent_exchanges" ADD CONSTRAINT "portable_consent_exchanges_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "portable_consent_exchanges" ADD CONSTRAINT "portable_consent_exchanges_source_website_id_websites_id_fk" FOREIGN KEY ("source_website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "portable_consent_exchanges" ADD CONSTRAINT "portable_consent_exchanges_target_website_id_websites_id_fk" FOREIGN KEY ("target_website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "portable_consent_exchanges" ADD CONSTRAINT "portable_consent_exchanges_source_consent_record_id_consent_records_id_fk" FOREIGN KEY ("source_consent_record_id") REFERENCES "public"."consent_records"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "portable_consent_exchanges" ADD CONSTRAINT "portable_consent_exchanges_imported_consent_record_id_consent_records_id_fk" FOREIGN KEY ("imported_consent_record_id") REFERENCES "public"."consent_records"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portable_consent_exchanges_org_idx" ON "portable_consent_exchanges" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portable_consent_exchanges_expiry_idx" ON "portable_consent_exchanges" USING btree ("expires_at");
--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "scopes" SET DEFAULT ARRAY['consent:evaluate','data:redact']::text[];
