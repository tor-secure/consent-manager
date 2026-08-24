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