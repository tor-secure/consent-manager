import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  boolean,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    key: varchar("key", {
      length: 100,
    }).notNull().unique(),

    name: varchar("name", {
      length: 255,
    }).notNull(),

    description: text("description"),

    category: varchar("category", {
      length: 100,
    }).notNull(),

    provider: varchar("provider", {
      length: 255,
    }).notNull(),

    iconUrl: text("icon_url"),

    documentationUrl: text("documentation_url"),

    configurationSchema: jsonb("configuration_schema")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

    isActive: boolean("is_active")
      .notNull()
      .default(true),

    isOfficial: boolean("is_official")
      .notNull()
      .default(true),

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
  (table) => [
    unique("integrations_provider_key_unique").on(
      table.provider,
      table.key,
    ),
  ],
);