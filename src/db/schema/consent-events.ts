import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

import { consentRecords } from "./consent-records";
import { consentPolicyVersions } from "./consent-policy-versions";

export const consentEvents = pgTable(
  "consent_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    consentRecordId: uuid("consent_record_id")
      .notNull()
      .references(() => consentRecords.id, {
        onDelete: "cascade",
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

    index("consent_events_policy_version_idx").on(
      table.policyVersionId,
    ),

    index("consent_events_type_idx").on(
      table.eventType,
    ),

    index("consent_events_occurred_at_idx").on(
      table.occurredAt,
    ),
  ],
);