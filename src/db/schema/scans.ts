import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

import { websites } from "./websites";

export const scans = pgTable("scans", {
  id: uuid("id").defaultRandom().primaryKey(),

  websiteId: uuid("website_id")
    .notNull()
    .references(() => websites.id, {
      onDelete: "cascade",
    }),

  status: varchar("status", {
    length: 50,
  })
    .notNull()
    .default("queued"),

  scanType: varchar("scan_type", {
    length: 50,
  })
    .notNull()
    .default("full"),

  triggeredBy: varchar("triggered_by", {
    length: 20,
  })
    .notNull()
    .default("manual"),

  scannerVersion: varchar("scanner_version", {
    length: 50,
  }),

  pagesScanned: integer("pages_scanned")
    .notNull()
    .default(0),

  itemsDetected: integer("items_detected")
    .notNull()
    .default(0),

  pagesDiscovered: integer("pages_discovered").notNull().default(0),
  resourcesObserved: integer("resources_observed").notNull().default(0),
  progress: integer("progress").notNull().default(0),
  crawlConfig: jsonb("crawl_config").$type<Record<string, unknown>>().notNull().default({}),
  retryCount: integer("retry_count").notNull().default(0),
  cancelRequestedAt: timestamp("cancel_requested_at", { withTimezone: true }),

  errorMessage: text("error_message"),

  startedAt: timestamp("started_at", {
    withTimezone: true,
  }),

  completedAt: timestamp("completed_at", {
    withTimezone: true,
  }),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});
