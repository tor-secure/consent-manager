import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  integer,
  unique,
  index,
} from "drizzle-orm/pg-core";

import { subscriptions } from "./subscriptions";

export const subscriptionUsage = pgTable(
  "subscription_usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id, {
        onDelete: "cascade",
      }),

    metric: varchar("metric", {
      length: 100,
    }).notNull(),

    periodStart: timestamp("period_start", {
      withTimezone: true,
    }).notNull(),

    periodEnd: timestamp("period_end", {
      withTimezone: true,
    }).notNull(),

    usedAmount: integer("used_amount")
      .notNull()
      .default(0),

    limitAmount: integer("limit_amount"),

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
    unique(
      "subscription_usage_subscription_metric_period_unique",
    ).on(
      table.subscriptionId,
      table.metric,
      table.periodStart,
      table.periodEnd,
    ),

    index("subscription_usage_subscription_idx").on(
      table.subscriptionId,
    ),

    index("subscription_usage_period_idx").on(
      table.periodStart,
      table.periodEnd,
    ),
  ],
);