import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  boolean,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";

import { websites } from "./websites";
import { vendors } from "./vendors";
import { purposes } from "./purposes";

export const trackers = pgTable(
  "trackers",
  {
    id: uuid("id").defaultRandom().primaryKey(),

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

    name: varchar("name", {
      length: 255,
    }).notNull(),

    type: varchar("type", {
      length: 50,
    }).notNull(),

    domain: varchar("domain", {
      length: 255,
    }),

    identifier: varchar("identifier", {
      length: 500,
    }),

    description: text("description"),

    category: varchar("category", { length: 100 }),

    cookieNames: jsonb("cookie_names").$type<string[]>().notNull().default([]),

    storageTypes: jsonb("storage_types").$type<string[]>().notNull().default([]),

    localStorageKeys: jsonb("local_storage_keys").$type<string[]>().notNull().default([]),

    sessionStorageKeys: jsonb("session_storage_keys").$type<string[]>().notNull().default([]),

    indexedDbNames: jsonb("indexed_db_names").$type<string[]>().notNull().default([]),

    scriptUrlPatterns: jsonb("script_url_patterns").$type<string[]>().notNull().default([]),

    iframeUrlPatterns: jsonb("iframe_url_patterns").$type<string[]>().notNull().default([]),

    pixelUrlPatterns: jsonb("pixel_url_patterns").$type<string[]>().notNull().default([]),

    scannerClassification: varchar("scanner_classification", { length: 30 })
      .notNull()
      .default("unmapped"),

    party: varchar("party", { length: 20 }).notNull().default("unknown"),

    duration: varchar("duration", { length: 255 }),

    deletionBehavior: text("deletion_behavior"),

    detectionMethod: varchar("detection_method", {
      length: 50,
    })
      .notNull()
      .default("manual"),

    status: varchar("status", {
      length: 50,
    })
      .notNull()
      .default("active"),

    isEssential: boolean("is_essential")
      .notNull()
      .default(false),

    firstSeenAt: timestamp("first_seen_at", {
      withTimezone: true,
    }),

    lastSeenAt: timestamp("last_seen_at", {
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

    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
    }),
  },
  (table) => [
    unique("trackers_website_identifier_unique").on(
      table.websiteId,
      table.identifier,
    ),
  ],
);