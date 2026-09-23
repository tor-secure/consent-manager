import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { websites } from "./websites";
import { consentRecords } from "./consent-records";
import { consentPolicyVersions } from "./consent-policy-versions";

export const consentEvents = pgTable(
  "consent_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "restrict",
      }),

    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, {
        onDelete: "restrict",
      }),

    consentId: varchar("consent_id", {
      length: 255,
    }).notNull(),

    consentRecordId: uuid("consent_record_id").references(() => consentRecords.id, {
      onDelete: "set null",
    }),

    policyVersionId: uuid("policy_version_id")
      .notNull()
      .references(() => consentPolicyVersions.id, {
        onDelete: "restrict",
      }),

    eventType: varchar("event_type", {
      length: 100,
    }).notNull(),

    eventData: jsonb("event_data")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

    source: varchar("source", {
      length: 50,
    })
      .notNull()
      .default("web"),

    occurredAt: timestamp("occurred_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("consent_events_record_idx").on(
      table.consentRecordId,
    ),

    index("consent_events_org_consent_idx").on(
      table.organizationId,
      table.consentId,
      table.occurredAt,
    ),

    index("consent_events_website_idx").on(
      table.websiteId,
    ),

    index("consent_events_policy_version_idx").on(
      table.policyVersionId,
    ),

    index("consent_events_type_idx").on(
      table.eventType,
    ),

    index("consent_events_occurred_at_idx").on(
      table.occurredAt,
    ),

    // Dashboard trends filter organisation + time. The consent_id column in
    // consent_events_org_consent_idx blocks that range scan.
    index("consent_events_org_occurred_idx").on(
      table.organizationId,
      table.occurredAt,
    ),
  ],
);
