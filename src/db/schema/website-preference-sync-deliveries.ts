import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { websitePreferenceSyncEndpoints } from "./website-preference-sync-endpoints";

export const websitePreferenceSyncDeliveries = pgTable(
  "website_preference_sync_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    endpointId: uuid("endpoint_id")
      .notNull()
      .references(() => websitePreferenceSyncEndpoints.id, { onDelete: "cascade" }),

    eventId: uuid("event_id").notNull(),

    eventType: varchar("event_type", { length: 100 }).notNull(),

    status: varchar("status", { length: 50 }).notNull().default("pending"),

    attemptNumber: integer("attempt_number").notNull().default(1),

    requestPayload: jsonb("request_payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

    responseStatusCode: integer("response_status_code"),

    responseBody: text("response_body"),

    errorMessage: text("error_message"),

    sentAt: timestamp("sent_at", { withTimezone: true }),

    completedAt: timestamp("completed_at", { withTimezone: true }),

    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("website_preference_sync_deliveries_endpoint_idx").on(table.endpointId),
    index("website_preference_sync_deliveries_status_idx").on(table.status),
    index("website_preference_sync_deliveries_event_id_idx").on(table.eventId),
    index("website_preference_sync_deliveries_next_retry_idx").on(table.nextRetryAt),
  ],
);
