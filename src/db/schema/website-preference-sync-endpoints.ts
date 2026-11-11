import {
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { websites } from "./websites";

export const websitePreferenceSyncEndpoints = pgTable(
  "website_preference_sync_endpoints",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),

    url: text("url").notNull(),

    status: varchar("status", { length: 50 }).notNull().default("active"),

    signingSecretEnc: text("signing_secret_enc").notNull(),

    lastDeliveryAt: timestamp("last_delivery_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("website_preference_sync_endpoints_website_unique").on(table.websiteId),
    index("website_preference_sync_endpoints_org_idx").on(table.organizationId),
    index("website_preference_sync_endpoints_status_idx").on(table.status),
  ],
);
