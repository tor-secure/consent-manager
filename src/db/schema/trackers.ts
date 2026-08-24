import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  boolean,
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