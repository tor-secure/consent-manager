import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  boolean,
  index,
  unique,
} from "drizzle-orm/pg-core";

import { accountConsentRecords } from "./account-consent-records";
import { purposes } from "./purposes";
import { vendors } from "./vendors";

export const accountConsentDecisions = pgTable(
  "account_consent_decisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    accountConsentRecordId: uuid("account_consent_record_id")
      .notNull()
      .references(() => accountConsentRecords.id, { onDelete: "cascade" }),

    purposeId: uuid("purpose_id").references(() => purposes.id, {
      onDelete: "set null",
    }),

    vendorId: uuid("vendor_id").references(() => vendors.id, {
      onDelete: "set null",
    }),

    decision: varchar("decision", { length: 20 }).notNull(),

    granted: boolean("granted").notNull(),

    decidedAt: timestamp("decided_at", { withTimezone: true }).defaultNow().notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("account_consent_decisions_record_idx").on(table.accountConsentRecordId),
    index("account_consent_decisions_purpose_idx").on(table.purposeId),
    index("account_consent_decisions_vendor_idx").on(table.vendorId),
    unique("account_consent_decisions_record_purpose_vendor_unique").on(
      table.accountConsentRecordId,
      table.purposeId,
      table.vendorId,
    ),
  ],
);
