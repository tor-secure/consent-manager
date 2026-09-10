import {
  boolean,
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { websites } from "./websites";
import { consentPolicyVersions } from "./consent-policy-versions";

export const californiaOptOutStates = pgTable(
  "california_opt_out_states",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    consentId: varchar("consent_id", { length: 255 }).notNull(),
    visitorId: varchar("visitor_id", { length: 255 }),
    state: varchar("state", { length: 40 }).notNull().default("unknown"),
    source: varchar("source", { length: 40 }).notNull().default("none"),
    saleOptOut: boolean("sale_opt_out").notNull().default(false),
    shareOptOut: boolean("share_opt_out").notNull().default(false),
    sensitivePiLimit: boolean("sensitive_pi_limit").notNull().default(false),
    gpcHeader: varchar("gpc_header", { length: 20 }).notNull().default("absent"),
    gpcClient: varchar("gpc_client", { length: 20 }).notNull().default("unknown"),
    jurisdiction: varchar("jurisdiction", { length: 100 }),
    policyVersionId: uuid("policy_version_id").references(() => consentPolicyVersions.id, {
      onDelete: "set null",
    }),
    effectiveAt: timestamp("effective_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("california_opt_out_org_idx").on(table.organizationId),
    index("california_opt_out_website_idx").on(table.websiteId),
    index("california_opt_out_consent_idx").on(table.consentId),
    unique("california_opt_out_org_website_consent_unique").on(
      table.organizationId,
      table.websiteId,
      table.consentId,
    ),
  ],
);
