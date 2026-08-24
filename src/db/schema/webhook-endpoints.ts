import {
  boolean,
  jsonb,
  pgTable,
  timestamp,
  text,
  uuid,
  varchar,
  index,
  unique,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";

export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),

    name: varchar("name", {
      length: 255,
    }).notNull(),

    url: text("url").notNull(),

    status: varchar("status", {
      length: 50,
    })
      .notNull()
      .default("active"),

    subscribedEvents: jsonb("subscribed_events")
      .$type<string[]>()
      .notNull()
      .default([]),

    signingSecretHash: text("signing_secret_hash"),

    description: text("description"),

    verified: boolean("verified")
      .notNull()
      .default(false),

    verifiedAt: timestamp("verified_at", {
      withTimezone: true,
    }),

    lastDeliveryAt: timestamp("last_delivery_at", {
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
    unique("webhook_endpoints_organization_url_unique").on(
      table.organizationId,
      table.url,
    ),

    index("webhook_endpoints_organization_idx").on(
      table.organizationId,
    ),

    index("webhook_endpoints_status_idx").on(
      table.status,
    ),
  ],
);