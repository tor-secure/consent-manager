CREATE TABLE "consent_policy_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"effective_from" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consent_policy_versions_policy_version_unique" UNIQUE("policy_id","version")
);
--> statement-breakpoint
ALTER TABLE "consent_policy_versions" ADD CONSTRAINT "consent_policy_versions_policy_id_consent_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."consent_policies"("id") ON DELETE cascade ON UPDATE no action;