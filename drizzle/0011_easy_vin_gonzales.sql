CREATE TABLE "policy_purposes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_version_id" uuid NOT NULL,
	"purpose_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "policy_purposes_policy_version_purpose_unique" UNIQUE("policy_version_id","purpose_id")
);
--> statement-breakpoint
ALTER TABLE "policy_purposes" ADD CONSTRAINT "policy_purposes_policy_version_id_consent_policy_versions_id_fk" FOREIGN KEY ("policy_version_id") REFERENCES "public"."consent_policy_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_purposes" ADD CONSTRAINT "policy_purposes_purpose_id_purposes_id_fk" FOREIGN KEY ("purpose_id") REFERENCES "public"."purposes"("id") ON DELETE cascade ON UPDATE no action;