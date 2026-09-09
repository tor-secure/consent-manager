ALTER TABLE "trackers" ADD COLUMN "category" varchar(100);--> statement-breakpoint
ALTER TABLE "trackers" ADD COLUMN "cookie_names" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "trackers" ADD COLUMN "storage_types" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "trackers" ADD COLUMN "local_storage_keys" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "trackers" ADD COLUMN "session_storage_keys" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "trackers" ADD COLUMN "indexed_db_names" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "trackers" ADD COLUMN "script_url_patterns" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "trackers" ADD COLUMN "iframe_url_patterns" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "trackers" ADD COLUMN "party" varchar(20) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "trackers" ADD COLUMN "duration" varchar(255);--> statement-breakpoint
ALTER TABLE "trackers" ADD COLUMN "deletion_behavior" text;