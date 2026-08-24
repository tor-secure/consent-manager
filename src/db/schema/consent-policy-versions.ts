import {
  boolean,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
  integer,
  unique,
} from "drizzle-orm/pg-core";

import { consentPolicies } from "./consent-policies";

export const consentPolicyVersions = pgTable(
  "consent_policy_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    policyId: uuid("policy_id")
      .notNull()
      .references(() => consentPolicies.id, {
        onDelete: "cascade",
      }),

    version: integer("version").notNull(),

    status: varchar("status", {
      length: 50,
    })
      .notNull()
      .default("draft"),

    configuration: jsonb("configuration")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

    isPublished: boolean("is_published")
      .notNull()
      .default(false),

    effectiveFrom: timestamp("effective_from", {
      withTimezone: true,
    }),

    publishedAt: timestamp("published_at", {
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
    unique("consent_policy_versions_policy_version_unique").on(
      table.policyId,
      table.version,
    ),
  ],
);