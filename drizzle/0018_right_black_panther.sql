CREATE TABLE "consent_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consent_record_id" uuid NOT NULL,
	"purpose_id" uuid,
	"vendor_id" uuid,
	"decision" varchar(20) NOT NULL,
	"granted" boolean NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consent_decisions_record_purpose_vendor_unique" UNIQUE("consent_record_id","purpose_id","vendor_id")
);
--> statement-breakpoint
ALTER TABLE "consent_decisions" ADD CONSTRAINT "consent_decisions_consent_record_id_consent_records_id_fk" FOREIGN KEY ("consent_record_id") REFERENCES "public"."consent_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_decisions" ADD CONSTRAINT "consent_decisions_purpose_id_purposes_id_fk" FOREIGN KEY ("purpose_id") REFERENCES "public"."purposes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_decisions" ADD CONSTRAINT "consent_decisions_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consent_decisions_record_idx" ON "consent_decisions" USING btree ("consent_record_id");--> statement-breakpoint
CREATE INDEX "consent_decisions_purpose_idx" ON "consent_decisions" USING btree ("purpose_id");--> statement-breakpoint
CREATE INDEX "consent_decisions_vendor_idx" ON "consent_decisions" USING btree ("vendor_id");