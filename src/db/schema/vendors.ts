import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  unique,
  integer,
  check,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { organizations } from "./organizations";

export const vendors = pgTable(
  "vendors",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),

    name: varchar("name", {
      length: 255,
    }).notNull(),

    key: varchar("key", {
      length: 150,
    }).notNull(),

    domain: varchar("domain", {
      length: 255,
    }),

    websiteUrl: text("website_url"),

    privacyPolicyUrl: text("privacy_policy_url"),

    country: varchar("country", {
      length: 100,
    }),

    legalName: varchar("legal_name", { length: 255 }),

    role: varchar("role", { length: 40 }).notNull().default("unknown"),

    processingCountries: jsonb("processing_countries")
      .$type<string[]>()
      .notNull()
      .default([]),

    dpaStatus: varchar("dpa_status", { length: 40 })
      .notNull()
      .default("not_configured"),

    dpaEffectiveAt: timestamp("dpa_effective_at", { withTimezone: true }),

    dpaReviewAt: timestamp("dpa_review_at", { withTimezone: true }),

    dpaReference: varchar("dpa_reference", { length: 255 }),

    downstreamDsarMode: varchar("downstream_dsar_mode", { length: 40 })
      .notNull()
      .default("not_required"),

    ccpaSale: varchar("ccpa_sale", { length: 40 }).notNull().default("unknown"),

    ccpaShare: varchar("ccpa_share", { length: 40 }).notNull().default("unknown"),

    ccpaSensitivePi: varchar("ccpa_sensitive_pi", { length: 40 })
      .notNull()
      .default("unknown"),

    description: text("description"),

    status: varchar("status", {
      length: 50,
    })
      .notNull()
      .default("active"),

    source: varchar("source", {
      length: 50,
    })
      .notNull()
      .default("custom"),

    iabVendorId: integer("iab_vendor_id"),

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
    unique("vendors_organization_key_unique").on(
      table.organizationId,
      table.key,
    ),
    check("vendors_iab_vendor_id_range", sql`${table.iabVendorId} is null or (${table.iabVendorId} between 1 and 65535)`),
  ],
);