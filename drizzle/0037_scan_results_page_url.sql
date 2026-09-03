-- ---------------------------------------------------------------------------
-- Migration: 0037_scan_results_page_url
--
-- Retains the scanned page URL on each scan_result so privacy intelligence
-- can be grouped by page. The scanner still fetches a single URL per scan;
-- this column does not add crawling.
-- ---------------------------------------------------------------------------

ALTER TABLE "scan_results"
  ADD COLUMN IF NOT EXISTS "page_url" varchar(2048);

CREATE INDEX IF NOT EXISTS "scan_results_scan_id_idx" ON "scan_results" ("scan_id");
CREATE INDEX IF NOT EXISTS "scan_results_scan_page_idx" ON "scan_results" ("scan_id", "page_url");
