import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  numeric,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { subscriptions } from "./subscriptions";

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),

    subscriptionId: uuid("subscription_id").references(
      () => subscriptions.id,
      {
        onDelete: "set null",
      },
    ),

    invoiceNumber: varchar("invoice_number", {
      length: 100,
    }).notNull().unique(),

    provider: varchar("provider", {
      length: 50,
    }),

    providerInvoiceId: varchar("provider_invoice_id", {
      length: 255,
    }),

    status: varchar("status", {
      length: 50,
    })
      .notNull()
      .default("draft"),

    currency: varchar("currency", {
      length: 10,
    })
      .notNull()
      .default("USD"),

    subtotal: numeric("subtotal", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),

    taxAmount: numeric("tax_amount", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),

    discountAmount: numeric("discount_amount", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),

    totalAmount: numeric("total_amount", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),

    billingPeriodStart: timestamp("billing_period_start", {
      withTimezone: true,
    }),

    billingPeriodEnd: timestamp("billing_period_end", {
      withTimezone: true,
    }),

    issuedAt: timestamp("issued_at", {
      withTimezone: true,
    }),

    dueAt: timestamp("due_at", {
      withTimezone: true,
    }),

    paidAt: timestamp("paid_at", {
      withTimezone: true,
    }),

    description: text("description"),

    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

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
    unique("invoices_provider_invoice_unique").on(
      table.provider,
      table.providerInvoiceId,
    ),

    index("invoices_organization_idx").on(
      table.organizationId,
    ),

    index("invoices_subscription_idx").on(
      table.subscriptionId,
    ),

    index("invoices_status_idx").on(
      table.status,
    ),

    index("invoices_created_at_idx").on(
      table.createdAt,
    ),
  ],
);