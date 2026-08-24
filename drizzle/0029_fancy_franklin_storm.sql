CREATE TABLE "subscription_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"metric" varchar(100) NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"used_amount" integer DEFAULT 0 NOT NULL,
	"limit_amount" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_usage_subscription_metric_period_unique" UNIQUE("subscription_id","metric","period_start","period_end")
);
--> statement-breakpoint
ALTER TABLE "subscription_usage" ADD CONSTRAINT "subscription_usage_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_usage_subscription_idx" ON "subscription_usage" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "subscription_usage_period_idx" ON "subscription_usage" USING btree ("period_start","period_end");