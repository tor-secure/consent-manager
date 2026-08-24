CREATE TABLE "vendor_purposes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"purpose_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendor_purposes_vendor_purpose_unique" UNIQUE("vendor_id","purpose_id")
);
--> statement-breakpoint
ALTER TABLE "vendor_purposes" ADD CONSTRAINT "vendor_purposes_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_purposes" ADD CONSTRAINT "vendor_purposes_purpose_id_purposes_id_fk" FOREIGN KEY ("purpose_id") REFERENCES "public"."purposes"("id") ON DELETE cascade ON UPDATE no action;