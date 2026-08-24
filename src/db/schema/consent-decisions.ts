import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  boolean,
  index,
  unique,
} from "drizzle-orm/pg-core";

import { consentRecords } from "./consent-records";
import { purposes } from "./purposes";
import { vendors } from "./vendors";

export const consentDecisions = pgTable(
  "consent_decisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    consentRecordId: uuid("consent_record_id")
      .notNull()
      .references(() => consentRecords.id, {
        onDelete: "cascade",
      }),

    purposeId: uuid("purpose_id").references(() => purposes.id, {
      onDelete: "set null",
    }),

    vendorId: uuid("vendor_id").references(() => vendors.id, {
      onDelete: "set null",
    }),

    decision: varchar("decision", {
      length: 20,
    }).notNull(),

    granted: boolean("granted").notNull(),

    decidedAt: timestamp("decided_at", {
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
    index("consent_decisions_record_idx").on(
      table.consentRecordId,
    ),

    index("consent_decisions_purpose_idx").on(
      table.purposeId,
    ),

    index("consent_decisions_vendor_idx").on(
      table.vendorId,
    ),

    unique("consent_decisions_record_purpose_vendor_unique").on(
      table.consentRecordId,
      table.purposeId,
      table.vendorId,
    ),
  ],
);