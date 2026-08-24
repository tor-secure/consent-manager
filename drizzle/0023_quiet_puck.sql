CREATE TABLE "website_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"website_id" uuid NOT NULL,
	"integration_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"connected_at" timestamp with time zone,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "website_integrations_website_integration_unique" UNIQUE("website_id","integration_id")
);
--> statement-breakpoint
ALTER TABLE "website_integrations" ADD CONSTRAINT "website_integrations_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_integrations" ADD CONSTRAINT "website_integrations_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "website_integrations_website_idx" ON "website_integrations" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "website_integrations_integration_idx" ON "website_integrations" USING btree ("integration_id");