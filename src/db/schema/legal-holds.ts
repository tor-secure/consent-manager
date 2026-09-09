import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { websites } from "./websites";
import { users } from "./users";

export const legalHolds = pgTable(
  "legal_holds",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),

    websiteId: uuid("website_id").references(() => websites.id, {
      onDelete: "set null",
    }),

    resourceType: varchar("resource_type", { length: 50 }).notNull(),

    resourceId: uuid("resource_id").notNull(),

    reason: text("reason").notNull(),

    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    releasedBy: uuid("released_by").references(() => users.id, {
      onDelete: "set null",
    }),

    releasedAt: timestamp("released_at", { withTimezone: true }),

    status: varchar("status", { length: 20 }).notNull().default("active"),
  },
  (table) => [
    index("legal_holds_org_idx").on(table.organizationId),
    index("legal_holds_resource_idx").on(table.resourceType, table.resourceId),
    index("legal_holds_status_idx").on(table.organizationId, table.status),
  ],
);
