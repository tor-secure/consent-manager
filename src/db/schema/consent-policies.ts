import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  boolean,
} from "drizzle-orm/pg-core";

import { websites } from "./websites";

export const consentPolicies = pgTable("consent_policies", {
  id: uuid("id").defaultRandom().primaryKey(),

  websiteId: uuid("website_id")
    .notNull()
    .references(() => websites.id, {
      onDelete: "cascade",
    }),

  name: varchar("name", {
    length: 255,
  }).notNull(),

  description: text("description"),

  status: varchar("status", {
    length: 50,
  })
    .notNull()
    .default("draft"),

  isDefault: boolean("is_default")
    .notNull()
    .default(false),

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
});