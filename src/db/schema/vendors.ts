import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  unique,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";

export const vendors = pgTable(
  "vendors",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),

    name: varchar("name", {
      length: 255,
    }).notNull(),

    key: varchar("key", {
      length: 150,
    }).notNull(),

    domain: varchar("domain", {
      length: 255,
    }),

    websiteUrl: text("website_url"),

    privacyPolicyUrl: text("privacy_policy_url"),

    country: varchar("country", {
      length: 100,
    }),

    description: text("description"),

    status: varchar("status", {
      length: 50,
    })
      .notNull()
      .default("active"),

    source: varchar("source", {
      length: 50,
    })
      .notNull()
      .default("custom"),

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
    unique("vendors_organization_key_unique").on(
      table.organizationId,
      table.key,
    ),
  ],
);