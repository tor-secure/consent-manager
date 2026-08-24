import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  jsonb,
  inet,
  index,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { users } from "./users";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),

    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    action: varchar("action", {
      length: 100,
    }).notNull(),

    resourceType: varchar("resource_type", {
      length: 100,
    }),

    resourceId: uuid("resource_id"),

    description: text("description"),

    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

    ipAddress: inet("ip_address"),

    userAgent: text("user_agent"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_logs_organization_idx").on(
      table.organizationId,
    ),

    index("audit_logs_user_idx").on(
      table.userId,
    ),

    index("audit_logs_resource_idx").on(
      table.resourceType,
      table.resourceId,
    ),

    index("audit_logs_created_at_idx").on(
      table.createdAt,
    ),
  ],
);