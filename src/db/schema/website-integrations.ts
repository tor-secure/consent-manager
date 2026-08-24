import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  boolean,
  jsonb,
  unique,
  index,
} from "drizzle-orm/pg-core";

import { websites } from "./websites";
import { integrations } from "./integrations";

export const websiteIntegrations = pgTable(
  "website_integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, {
        onDelete: "cascade",
      }),

    integrationId: uuid("integration_id")
      .notNull()
      .references(() => integrations.id, {
        onDelete: "cascade",
      }),

    status: varchar("status", {
      length: 50,
    })
      .notNull()
      .default("active"),

    configuration: jsonb("configuration")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

    enabled: boolean("enabled")
      .notNull()
      .default(true),

    connectedAt: timestamp("connected_at", {
      withTimezone: true,
    }),

    lastVerifiedAt: timestamp("last_verified_at", {
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
    unique("website_integrations_website_integration_unique").on(
      table.websiteId,
      table.integrationId,
    ),

    index("website_integrations_website_idx").on(
      table.websiteId,
    ),

    index("website_integrations_integration_idx").on(
      table.integrationId,
    ),
  ],
);