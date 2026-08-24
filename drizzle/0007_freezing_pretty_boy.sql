CREATE TABLE "websites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"domain" varchar(255) NOT NULL,
	"description" text,
	"environment" varchar(50) DEFAULT 'production' NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"site_key" varchar(255) NOT NULL,
	"default_language" varchar(10) DEFAULT 'en' NOT NULL,
	"default_region" varchar(10),
	"verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "websites_site_key_unique" UNIQUE("site_key"),
	CONSTRAINT "websites_organization_domain_unique" UNIQUE("organization_id","domain")
);
--> statement-breakpoint
ALTER TABLE "websites" ADD CONSTRAINT "websites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;