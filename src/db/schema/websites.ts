import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  boolean,
  unique,
  jsonb,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";

export const websites = pgTable(
  "websites",
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

    domain: varchar("domain", {
      length: 255,
    }).notNull(),

    description: text("description"),

    environment: varchar("environment", {
      length: 50,
    })
      .notNull()
      .default("production"),

    status: varchar("status", {
      length: 50,
    })
      .notNull()
      .default("active"),

    siteKey: varchar("site_key", {
      length: 255,
    }).notNull().unique(),

    defaultLanguage: varchar("default_language", {
      length: 10,
    })
      .notNull()
      .default("en"),

    defaultRegion: varchar("default_region", {
      length: 10,
    }),

    defaultRegulationKey: varchar("default_regulation_key", {
      length: 32,
    }),

    consentIntegrations: jsonb("consent_integrations")
      .$type<Record<string, unknown>>(),

    verified: boolean("verified")
      .notNull()
      .default(false),

    verifiedAt: timestamp("verified_at", {
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
    unique("websites_organization_domain_unique").on(
      table.organizationId,
      table.domain,
    ),
  ],
);