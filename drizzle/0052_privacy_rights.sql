ALTER TABLE "data_principal_requests"
  ADD COLUMN IF NOT EXISTS "jurisdiction" varchar(32) DEFAULT 'dpdp' NOT NULL;
--> statement-breakpoint
ALTER TABLE "data_principal_requests"
  ADD COLUMN IF NOT EXISTS "jurisdiction_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "data_principal_requests"
  ADD COLUMN IF NOT EXISTS "requester_reference" varchar(32);
--> statement-breakpoint
ALTER TABLE "data_principal_requests"
  ADD COLUMN IF NOT EXISTS "requester_kind" varchar(30) DEFAULT 'direct_requester' NOT NULL;
--> statement-breakpoint
ALTER TABLE "data_principal_requests"
  ADD COLUMN IF NOT EXISTS "agent_authorization_note" text;
--> statement-breakpoint
ALTER TABLE "data_principal_requests"
  ADD COLUMN IF NOT EXISTS "verification_status" varchar(40) DEFAULT 'unverified' NOT NULL;
--> statement-breakpoint
ALTER TABLE "data_principal_requests"
  ADD COLUMN IF NOT EXISTS "verification_method" varchar(40);
--> statement-breakpoint
ALTER TABLE "data_principal_requests"
  ADD COLUMN IF NOT EXISTS "verification_expires_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "data_principal_requests"
  ADD COLUMN IF NOT EXISTS "verified_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "data_principal_requests"
  ADD COLUMN IF NOT EXISTS "assigned_to" uuid;
--> statement-breakpoint
ALTER TABLE "data_principal_requests"
  ADD COLUMN IF NOT EXISTS "deadline_kind" varchar(40) DEFAULT 'legacy_dpdp_default' NOT NULL;
--> statement-breakpoint
ALTER TABLE "data_principal_requests"
  ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "data_principal_requests"
  ADD COLUMN IF NOT EXISTS "outcome" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
UPDATE "data_principal_requests"
SET "requester_reference" = 'RR' || upper(substr(replace(id::text, '-', ''), 1, 10))
WHERE "requester_reference" IS NULL;
--> statement-breakpoint
ALTER TABLE "data_principal_requests"
  ADD CONSTRAINT "data_principal_requests_assigned_to_users_id_fk"
  FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dpr_requester_reference_unique"
  ON "data_principal_requests" USING btree ("requester_reference");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dpr_verification_status_idx"
  ON "data_principal_requests" USING btree ("verification_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dpr_jurisdiction_idx"
  ON "data_principal_requests" USING btree ("jurisdiction");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rights_request_verifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "request_id" uuid NOT NULL,
  "purpose" varchar(30) NOT NULL,
  "token_hash" varchar(64) NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "failed_attempts" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "rights_request_verifications_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "rights_request_verifications"
  ADD CONSTRAINT "rights_request_verifications_organization_id_organizations_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "rights_request_verifications"
  ADD CONSTRAINT "rights_request_verifications_request_id_data_principal_requests_id_fk"
  FOREIGN KEY ("request_id") REFERENCES "public"."data_principal_requests"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rights_verifications_org_idx"
  ON "rights_request_verifications" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rights_verifications_request_idx"
  ON "rights_request_verifications" USING btree ("request_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rights_verifications_hash_idx"
  ON "rights_request_verifications" USING btree ("token_hash");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rights_request_exports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "request_id" uuid NOT NULL,
  "export_kind" varchar(30) NOT NULL,
  "payload" jsonb NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "accessed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "rights_request_exports"
  ADD CONSTRAINT "rights_request_exports_organization_id_organizations_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "rights_request_exports"
  ADD CONSTRAINT "rights_request_exports_request_id_data_principal_requests_id_fk"
  FOREIGN KEY ("request_id") REFERENCES "public"."data_principal_requests"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "rights_request_exports"
  ADD CONSTRAINT "rights_request_exports_created_by_users_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rights_exports_org_idx"
  ON "rights_request_exports" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rights_exports_request_idx"
  ON "rights_request_exports" USING btree ("request_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rights_exports_expiry_idx"
  ON "rights_request_exports" USING btree ("expires_at");
