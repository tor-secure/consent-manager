import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { websites } from "./websites";
import { consentPolicyVersions } from "./consent-policy-versions";

export const consentRecords = pgTable(
  "consent_records",
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

    policyVersionId: uuid("policy_version_id")
      .notNull()
      .references(() => consentPolicyVersions.id, {
        onDelete: "restrict",
      }),

    consentId: varchar("consent_id", {
      length: 255,
    }).notNull().unique(),

    visitorId: varchar("visitor_id", {
      length: 255,
    }),

    jurisdiction: varchar("jurisdiction", {
      length: 100,
    }),

    status: varchar("status", {
      length: 50,
    })
      .notNull()
      .default("active"),

    source: varchar("source", {
      length: 50,
    })
      .notNull()
      .default("web"),

    consentedAt: timestamp("consented_at", {
      withTimezone: true,
    }),

    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }),

    withdrawnAt: timestamp("withdrawn_at", {
      withTimezone: true,
    }),

    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

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
    index("consent_records_organization_idx").on(
      table.organizationId,
    ),

    index("consent_records_website_idx").on(
      table.websiteId,
    ),

    index("consent_records_policy_version_idx").on(
      table.policyVersionId,
    ),

    index("consent_records_visitor_idx").on(
      table.visitorId,
    ),

    index("consent_records_created_at_idx").on(
      table.createdAt,
    ),

    index("consent_records_org_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
  ],
);