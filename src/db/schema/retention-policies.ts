import {
  boolean,
  index,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { websites } from "./websites";

export const retentionPolicies = pgTable(
  "retention_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),

    websiteId: uuid("website_id").references(() => websites.id, {
      onDelete: "set null",
    }),

    resourceType: varchar("resource_type", { length: 50 }).notNull(),

    retentionDays: integer("retention_days").notNull(),

    enabled: boolean("enabled").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("retention_policies_org_idx").on(table.organizationId),
    index("retention_policies_org_resource_idx").on(
      table.organizationId,
      table.resourceType,
    ),
  ],
);
