CREATE TABLE "iab_gvl_cache" (
	"version" integer PRIMARY KEY NOT NULL,
	"specification_version" integer NOT NULL,
	"tcf_policy_version" integer NOT NULL,
	"source_url" text NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(24) DEFAULT 'current' NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"validated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "purposes" ADD COLUMN "iab_tcf_purpose_id" integer;--> statement-breakpoint
ALTER TABLE "purposes" ADD COLUMN "iab_gpp_purpose_id" integer;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "iab_vendor_id" integer;--> statement-breakpoint
ALTER TABLE "websites" ADD COLUMN "iab_registration" jsonb;--> statement-breakpoint
ALTER TABLE "websites" ADD COLUMN "iab_mapping" jsonb;--> statement-breakpoint
CREATE INDEX "iab_gvl_cache_status_idx" ON "iab_gvl_cache" USING btree ("status");--> statement-breakpoint
CREATE INDEX "iab_gvl_cache_fetched_idx" ON "iab_gvl_cache" USING btree ("fetched_at");