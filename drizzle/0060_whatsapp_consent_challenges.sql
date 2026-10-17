CREATE TABLE IF NOT EXISTS "whatsapp_consent_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"policy_version_id" uuid NOT NULL,
	"policy_version_number" integer NOT NULL,
	"jurisdiction" varchar(100) NOT NULL,
	"locale" varchar(35) NOT NULL,
	"notice_hash" varchar(64) NOT NULL,
	"notice_snapshot" jsonb NOT NULL,
	"phone_e164" varchar(20) NOT NULL,
	"phone_hash" varchar(64) NOT NULL,
	"phone_last4" varchar(4) NOT NULL,
	"otp_hash" varchar(64) NOT NULL,
	"session_token_hash" varchar(64),
	"status" varchar(20) DEFAULT 'otp_sent' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"send_count" integer DEFAULT 1 NOT NULL,
	"otp_expires_at" timestamp with time zone NOT NULL,
	"resend_available_at" timestamp with time zone NOT NULL,
	"otp_message_id" varchar(255),
	"otp_delivery_status" varchar(30),
	"confirmation_message_id" varchar(255),
	"consent_id" varchar(255),
	"verified_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whatsapp_consent_challenges" ADD CONSTRAINT "whatsapp_consent_challenges_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "whatsapp_consent_challenges" ADD CONSTRAINT "whatsapp_consent_challenges_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "whatsapp_consent_challenges" ADD CONSTRAINT "whatsapp_consent_challenges_policy_id_consent_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."consent_policies"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "whatsapp_consent_challenges" ADD CONSTRAINT "whatsapp_consent_challenges_policy_version_id_consent_policy_versions_id_fk" FOREIGN KEY ("policy_version_id") REFERENCES "public"."consent_policy_versions"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_consent_challenges_site_phone_idx" ON "whatsapp_consent_challenges" USING btree ("website_id","phone_hash","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_consent_challenges_org_created_idx" ON "whatsapp_consent_challenges" USING btree ("organization_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_consent_challenges_otp_message_idx" ON "whatsapp_consent_challenges" USING btree ("otp_message_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_consent_challenges_consent_idx" ON "whatsapp_consent_challenges" USING btree ("consent_id");
