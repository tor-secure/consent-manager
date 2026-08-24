import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  boolean,
  index,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { users } from "./users";

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),

    createdByUserId: uuid("created_by_user_id").references(
      () => users.id,
      {
        onDelete: "set null",
      },
    ),

    name: varchar("name", {
      length: 255,
    }).notNull(),

    keyPrefix: varchar("key_prefix", {
      length: 20,
    }).notNull(),

    keyHash: text("key_hash").notNull(),

    environment: varchar("environment", {
      length: 20,
    })
      .notNull()
      .default("live"),

    status: varchar("status", {
      length: 50,
    })
      .notNull()
      .default("active"),

    lastUsedAt: timestamp("last_used_at", {
      withTimezone: true,
    }),

    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }),

    revokedAt: timestamp("revoked_at", {
      withTimezone: true,
    }),

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
    index("api_keys_organization_idx").on(
      table.organizationId,
    ),

    index("api_keys_key_prefix_idx").on(
      table.keyPrefix,
    ),

    index("api_keys_status_idx").on(
      table.status,
    ),
  ],
);