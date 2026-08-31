import {
  boolean,
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  unique,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";

export const purposes = pgTable(
  "purposes",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),

    key: varchar("key", {
      length: 100,
    }).notNull(),

    name: varchar("name", {
      length: 150,
    }).notNull(),

    description: text("description"),

    isRequired: boolean("is_required")
      .notNull()
      .default(false),

    status: varchar("status", {
      length: 50,
    })
      .notNull()
      .default("active"),

    // ── DPDP Rules 2025 Rule 3 enrichment fields ──────────────────────────
    //
    // dataCategories: free-text labels of the personal data categories
    //   processed under this purpose, e.g. ["Email address", "IP address"].
    //   Stored as a PostgreSQL text array; NULL means "not specified".
    //
    // retentionPeriod: human-readable retention string shown in the notice,
    //   e.g. "12 months", "Until account deletion", "90 days from last visit".
    //   NULL means "not specified".
    //
    // legalBasis: one of the DPDP-recognised processing grounds.
    //   Defaults to "consent" since this is a consent management platform.
    //   NULL is allowed for legacy rows; the UI defaults to "consent".

    dataCategories: text("data_categories").array(),

    retentionPeriod: varchar("retention_period", { length: 255 }),

    legalBasis: varchar("legal_basis", { length: 50 }),

    // ─────────────────────────────────────────────────────────────────────

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

    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
    }),
  },
  (table) => [
    unique("purposes_organization_key_unique").on(
      table.organizationId,
      table.key,
    ),
  ],
);
