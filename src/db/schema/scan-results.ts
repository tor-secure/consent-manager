import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  jsonb,
} from "drizzle-orm/pg-core";

import { scans } from "./scans";
import { websites } from "./websites";
import { vendors } from "./vendors";
import { purposes } from "./purposes";

export const scanResults = pgTable("scan_results", {
  id: uuid("id").defaultRandom().primaryKey(),

  scanId: uuid("scan_id")
    .notNull()
    .references(() => scans.id, {
      onDelete: "cascade",
    }),

  websiteId: uuid("website_id")
    .notNull()
    .references(() => websites.id, {
      onDelete: "cascade",
    }),

  vendorId: uuid("vendor_id").references(() => vendors.id, {
    onDelete: "set null",
  }),

  purposeId: uuid("purpose_id").references(() => purposes.id, {
    onDelete: "set null",
  }),

  type: varchar("type", {
    length: 50,
  }).notNull(),

  name: varchar("name", {
    length: 255,
  }).notNull(),

  domain: varchar("domain", {
    length: 255,
  }),

  identifier: varchar("identifier", {
    length: 500,
  }),

  classificationStatus: varchar("classification_status", {
    length: 50,
  })
    .notNull()
    .default("unclassified"),

  riskLevel: varchar("risk_level", {
    length: 50,
  }).default("unknown"),

  details: jsonb("details")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),

  detectedAt: timestamp("detected_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});