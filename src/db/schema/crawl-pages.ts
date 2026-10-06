import { index, integer, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { scans } from "./scans";
import { websites } from "./websites";

/** A bounded, sanitized record of each browser page visited by a crawl. */
export const crawlPages = pgTable("crawl_pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  scanId: uuid("scan_id").notNull().references(() => scans.id, { onDelete: "cascade" }),
  websiteId: uuid("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),
  url: varchar("url", { length: 512 }).notNull(),
  normalizedUrl: varchar("normalized_url", { length: 512 }).notNull(),
  depth: integer("depth").notNull(),
  statusCode: integer("status_code"),
  title: varchar("title", { length: 512 }),
  errorMessage: varchar("error_message", { length: 512 }),
  resourcesObserved: integer("resources_observed").notNull().default(0),
  cookiesObserved: integer("cookies_observed").notNull().default(0),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  crawledAt: timestamp("crawled_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("crawl_pages_scan_idx").on(table.scanId),
  index("crawl_pages_site_url_idx").on(table.websiteId, table.normalizedUrl),
]);
