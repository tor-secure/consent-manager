import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { consentRecords } from "./consent-records";
import { organizations } from "./organizations";
import { websites } from "./websites";

export const portableConsentExchanges = pgTable(
  "portable_consent_exchanges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jti: uuid("jti").notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    sourceWebsiteId: uuid("source_website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    targetWebsiteId: uuid("target_website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    sourceConsentRecordId: uuid("source_consent_record_id").references(
      () => consentRecords.id,
      { onDelete: "set null" },
    ),
    importedConsentRecordId: uuid("imported_consent_record_id").references(
      () => consentRecords.id,
      { onDelete: "set null" },
    ),
    tokenHash: text("token_hash").notNull(),
    codeHash: text("code_hash").notNull(),
    claims: jsonb("claims").$type<Record<string, unknown>>().notNull(),
    status: varchar("status", { length: 20 }).notNull().default("issued"),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("portable_consent_exchanges_jti_unique").on(table.jti),
    unique("portable_consent_exchanges_token_hash_unique").on(table.tokenHash),
    unique("portable_consent_exchanges_code_hash_unique").on(table.codeHash),
    index("portable_consent_exchanges_org_idx").on(table.organizationId),
    index("portable_consent_exchanges_expiry_idx").on(table.expiresAt),
  ],
);
