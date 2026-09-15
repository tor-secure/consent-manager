import { index, pgTable, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";

export const inboundWebhooks = pgTable(
  "inbound_webhooks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: varchar("provider", { length: 50 }).notNull(),
    eventId: varchar("event_id", { length: 255 }).notNull(),
    eventType: varchar("event_type", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("inbound_webhooks_provider_event_unique").on(table.provider, table.eventId),
    index("inbound_webhooks_created_idx").on(table.createdAt),
  ],
);
