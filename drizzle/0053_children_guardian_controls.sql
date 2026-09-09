CREATE TABLE IF NOT EXISTS "age_assurance_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"consent_id" varchar(255),
	"age_status" varchar(40) DEFAULT 'unknown' NOT NULL,
	"age_band" varchar(20) DEFAULT 'unknown' NOT NULL,
	"assurance_method" varchar(40),
	"asserted_over_threshold" boolean,
	"guardian_required" boolean DEFAULT false NOT NULL,
	"guardian_status" varchar(40) DEFAULT 'none' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guardian_authorization_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"purpose" varchar(30) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guardian_requests_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "data_principal_requests" ALTER COLUMN "jurisdiction_snapshot" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "data_principal_requests" ALTER COLUMN "outcome" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "child_protection" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "age_assurance_sessions" ADD CONSTRAINT "age_assurance_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "age_assurance_sessions" ADD CONSTRAINT "age_assurance_sessions_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_authorization_requests" ADD CONSTRAINT "guardian_authorization_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_authorization_requests" ADD CONSTRAINT "guardian_authorization_requests_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_authorization_requests" ADD CONSTRAINT "guardian_authorization_requests_session_id_age_assurance_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."age_assurance_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "age_sessions_org_idx" ON "age_assurance_sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "age_sessions_website_idx" ON "age_assurance_sessions" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "age_sessions_consent_idx" ON "age_assurance_sessions" USING btree ("consent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guardian_requests_org_idx" ON "guardian_authorization_requests" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guardian_requests_session_idx" ON "guardian_authorization_requests" USING btree ("session_id");