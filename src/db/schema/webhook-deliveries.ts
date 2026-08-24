import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

import { webhookEndpoints } from "./webhook-endpoints";

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    webhookEndpointId: uuid("webhook_endpoint_id")
      .notNull()
      .references(() => webhookEndpoints.id, {
        onDelete: "cascade",
      }),

    eventId: uuid("event_id"),

    eventType: varchar("event_type", {
      length: 100,
    }).notNull(),

    status: varchar("status", {
      length: 50,
    })
      .notNull()
      .default("pending"),

    attemptNumber: integer("attempt_number")
      .notNull()
      .default(1),

    requestPayload: jsonb("request_payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

    responseStatusCode: integer("response_status_code"),

    responseBody: text("response_body"),

    errorMessage: text("error_message"),

    sentAt: timestamp("sent_at", {
      withTimezone: true,
    }),

    completedAt: timestamp("completed_at", {
      withTimezone: true,
    }),

    nextRetryAt: timestamp("next_retry_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("webhook_deliveries_endpoint_idx").on(
      table.webhookEndpointId,
    ),

    index("webhook_deliveries_status_idx").on(
      table.status,
    ),

    index("webhook_deliveries_event_type_idx").on(
      table.eventType,
    ),

    index("webhook_deliveries_created_at_idx").on(
      table.createdAt,
    ),
  ],
);