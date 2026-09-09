CREATE TABLE "autopilot_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"baseline_fingerprint" varchar(64) NOT NULL,
	"plan" jsonb NOT NULL,
	"rollback_state" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digital_twin_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"source" varchar(30) NOT NULL,
	"source_id" uuid,
	"graph_hash" varchar(64) NOT NULL,
	"quality_score" integer,
	"input_payload" jsonb NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intelligence_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid,
	"actor_user_id" uuid,
	"engine" varchar(50) NOT NULL,
	"input_fingerprint" varchar(64) NOT NULL,
	"provider" varchar(100) NOT NULL,
	"provider_model" varchar(255),
	"fallback" boolean NOT NULL,
	"deterministic_output" jsonb NOT NULL,
	"ai_enrichment" jsonb NOT NULL,
	"usage" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "negotiation_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"offers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"constraints" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "negotiation_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"offer_key" varchar(100) NOT NULL,
	"outcome" varchar(30) NOT NULL,
	"purpose_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roi_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"website_id" uuid,
	"monthly_sessions" integer,
	"value_per_conversion" double precision,
	"value_per_consent" double precision,
	"implementation_cost" double precision,
	"recurring_monthly_cost" double precision,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"target_score" integer DEFAULT 85 NOT NULL,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "autopilot_plans" ADD CONSTRAINT "autopilot_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autopilot_plans" ADD CONSTRAINT "autopilot_plans_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autopilot_plans" ADD CONSTRAINT "autopilot_plans_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_twin_snapshots" ADD CONSTRAINT "digital_twin_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_twin_snapshots" ADD CONSTRAINT "digital_twin_snapshots_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_twin_snapshots" ADD CONSTRAINT "digital_twin_snapshots_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligence_runs" ADD CONSTRAINT "intelligence_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligence_runs" ADD CONSTRAINT "intelligence_runs_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligence_runs" ADD CONSTRAINT "intelligence_runs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_configurations" ADD CONSTRAINT "negotiation_configurations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_configurations" ADD CONSTRAINT "negotiation_configurations_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_configurations" ADD CONSTRAINT "negotiation_configurations_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_outcomes" ADD CONSTRAINT "negotiation_outcomes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_outcomes" ADD CONSTRAINT "negotiation_outcomes_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roi_configurations" ADD CONSTRAINT "roi_configurations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roi_configurations" ADD CONSTRAINT "roi_configurations_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roi_configurations" ADD CONSTRAINT "roi_configurations_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "autopilot_plans_site_idx" ON "autopilot_plans" USING btree ("organization_id","website_id","created_at");--> statement-breakpoint
CREATE INDEX "digital_twin_site_created_idx" ON "digital_twin_snapshots" USING btree ("organization_id","website_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "digital_twin_source_unique" ON "digital_twin_snapshots" USING btree ("website_id","source","source_id");--> statement-breakpoint
CREATE INDEX "intelligence_runs_org_site_created_idx" ON "intelligence_runs" USING btree ("organization_id","website_id","created_at");--> statement-breakpoint
CREATE INDEX "intelligence_runs_fingerprint_idx" ON "intelligence_runs" USING btree ("input_fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "negotiation_configuration_site_unique" ON "negotiation_configurations" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "negotiation_outcomes_site_time_idx" ON "negotiation_outcomes" USING btree ("organization_id","website_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "roi_configuration_scope_unique" ON "roi_configurations" USING btree ("organization_id","website_id");