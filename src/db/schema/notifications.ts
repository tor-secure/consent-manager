import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { users } from "./users";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),

    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),

    type: varchar("type", {
      length: 100,
    }).notNull(),

    priority: varchar("priority", {
      length: 20,
    })
      .notNull()
      .default("normal"),

    title: varchar("title", {
      length: 255,
    }).notNull(),

    message: text("message").notNull(),

    resourceType: varchar("resource_type", {
      length: 100,
    }),

    resourceId: uuid("resource_id"),

    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

    isRead: boolean("is_read")
      .notNull()
      .default(false),

    readAt: timestamp("read_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }),
  },
  (table) => [
    index("notifications_organization_idx").on(
      table.organizationId,
    ),

    index("notifications_user_idx").on(
      table.userId,
    ),

    index("notifications_read_idx").on(
      table.isRead,
    ),

    index("notifications_created_at_idx").on(
      table.createdAt,
    ),
  ],
);