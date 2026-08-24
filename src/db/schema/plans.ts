import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    key: varchar("key", {
      length: 100,
    })
      .notNull()
      .unique(),

    name: varchar("name", {
      length: 100,
    }).notNull(),

    description: text("description"),

    priceMonthly: numeric("price_monthly", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),

    priceYearly: numeric("price_yearly", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),

    currency: varchar("currency", {
      length: 10,
    })
      .notNull()
      .default("USD"),

    maxWebsites: integer("max_websites"),

    maxMonthlyVisitors: integer("max_monthly_visitors"),

    maxConsentEvents: integer("max_consent_events"),

    maxApiRequests: integer("max_api_requests"),

    maxScansPerMonth: integer("max_scans_per_month"),

    dataRetentionDays: integer("data_retention_days"),

    features: jsonb("features")
      .$type<Record<string, boolean>>()
      .notNull()
      .default({}),

    isActive: boolean("is_active")
      .notNull()
      .default(true),

    isPublic: boolean("is_public")
      .notNull()
      .default(true),

    sortOrder: integer("sort_order")
      .notNull()
      .default(0),

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
  },
);