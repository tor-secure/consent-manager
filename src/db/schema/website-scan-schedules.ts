import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { websites } from "./websites";
import { scans } from "./scans";

export const websiteScanSchedules = pgTable(
  "website_scan_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),

    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, {
        onDelete: "cascade",
      }),

    enabled: boolean("enabled").notNull().default(false),

    frequency: varchar("frequency", {
      length: 20,
    })
      .notNull()
      .default("weekly"),

    timezone: varchar("timezone", {
      length: 100,
    })
      .notNull()
      .default("UTC"),

    nextScanAt: timestamp("next_scan_at", {
      withTimezone: true,
    }),

    lastScanAt: timestamp("last_scan_at", {
      withTimezone: true,
    }),

    lastScanStatus: varchar("last_scan_status", {
      length: 50,
    }),

    lastScanId: uuid("last_scan_id").references(() => scans.id, {
      onDelete: "set null",
    }),

    lastError: text("last_error"),

    consecutiveFailures: integer("consecutive_failures").notNull().default(0),

    lockedUntil: timestamp("locked_until", {
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
  },
  (table) => [
    unique("website_scan_schedules_website_unique").on(table.websiteId),
    index("website_scan_schedules_org_idx").on(table.organizationId),
    index("website_scan_schedules_due_idx").on(table.enabled, table.nextScanAt),
  ],
);
