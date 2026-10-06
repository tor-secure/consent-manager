ALTER TABLE "scans"
  ADD COLUMN IF NOT EXISTS "pages_discovered" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "resources_observed" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "progress" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "crawl_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "retry_count" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "cancel_requested_at" timestamp with time zone;

CREATE TABLE IF NOT EXISTS "crawl_pages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "scan_id" uuid NOT NULL REFERENCES "scans"("id") ON DELETE cascade,
  "website_id" uuid NOT NULL REFERENCES "websites"("id") ON DELETE cascade,
  "url" varchar(512) NOT NULL,
  "normalized_url" varchar(512) NOT NULL,
  "depth" integer NOT NULL,
  "status_code" integer,
  "title" varchar(512),
  "error_message" varchar(512),
  "resources_observed" integer DEFAULT 0 NOT NULL,
  "cookies_observed" integer DEFAULT 0 NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "crawled_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "crawl_pages_scan_idx" ON "crawl_pages" ("scan_id");
CREATE INDEX IF NOT EXISTS "crawl_pages_site_url_idx" ON "crawl_pages" ("website_id", "normalized_url");
