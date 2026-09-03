import {
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { websites } from "./websites";
import { consentPolicies } from "./consent-policies";

export const websiteJurisdictionRules = pgTable(
  "website_jurisdiction_rules",
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

    countryCode: varchar("country_code", { length: 2 }).notNull(),

    regionCode: varchar("region_code", { length: 16 }).notNull().default(""),

    policyId: uuid("policy_id")
      .notNull()
      .references(() => consentPolicies.id, {
        onDelete: "cascade",
      }),

    regulationKey: varchar("regulation_key", { length: 32 }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("website_jurisdiction_rules_site_geo_unique").on(
      table.websiteId,
      table.countryCode,
      table.regionCode,
    ),
    index("website_jurisdiction_rules_organization_idx").on(table.organizationId),
    index("website_jurisdiction_rules_website_idx").on(table.websiteId),
  ],
);
