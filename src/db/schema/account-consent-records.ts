import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  jsonb,
  index,
  integer,
  unique,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { websites } from "./websites";
import { consentPolicyVersions } from "./consent-policy-versions";
import { consentSubjects } from "./consent-subjects";

export const accountConsentRecords = pgTable(
  "account_consent_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),

    subjectId: uuid("subject_id")
      .notNull()
      .references(() => consentSubjects.id, { onDelete: "cascade" }),

    policyVersionId: uuid("policy_version_id")
      .notNull()
      .references(() => consentPolicyVersions.id, { onDelete: "restrict" }),

    status: varchar("status", { length: 50 }).notNull().default("active"),

    stateVersion: integer("state_version").notNull().default(1),

    source: varchar("source", { length: 50 }).notNull().default("web"),

    consentedAt: timestamp("consented_at", { withTimezone: true }),

    expiresAt: timestamp("expires_at", { withTimezone: true }),

    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),

    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("account_consent_records_subject_unique").on(table.subjectId),
    index("account_consent_records_org_idx").on(table.organizationId),
    index("account_consent_records_website_idx").on(table.websiteId),
    index("account_consent_records_subject_idx").on(table.subjectId),
  ],
);
