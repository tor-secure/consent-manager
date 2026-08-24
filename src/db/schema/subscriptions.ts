import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  boolean,
  unique,
  index,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { plans } from "./plans";

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),

    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, {
        onDelete: "restrict",
      }),

    status: varchar("status", {
      length: 50,
    })
      .notNull()
      .default("active"),

    billingInterval: varchar("billing_interval", {
      length: 20,
    })
      .notNull()
      .default("monthly"),

    provider: varchar("provider", {
      length: 50,
    }),

    providerSubscriptionId: varchar("provider_subscription_id", {
      length: 255,
    }),

    providerCustomerId: varchar("provider_customer_id", {
      length: 255,
    }),

    trialStartAt: timestamp("trial_start_at", {
      withTimezone: true,
    }),

    trialEndAt: timestamp("trial_end_at", {
      withTimezone: true,
    }),

    currentPeriodStartAt: timestamp("current_period_start_at", {
      withTimezone: true,
    }),

    currentPeriodEndAt: timestamp("current_period_end_at", {
      withTimezone: true,
    }),

    cancelAtPeriodEnd: boolean("cancel_at_period_end")
      .notNull()
      .default(false),

    cancelledAt: timestamp("cancelled_at", {
      withTimezone: true,
    }),

    startedAt: timestamp("started_at", {
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
    unique("subscriptions_organization_unique").on(
      table.organizationId,
    ),

    index("subscriptions_plan_idx").on(
      table.planId,
    ),

    index("subscriptions_status_idx").on(
      table.status,
    ),

    unique("subscriptions_provider_subscription_unique").on(
      table.provider,
      table.providerSubscriptionId,
    ),
  ],
);