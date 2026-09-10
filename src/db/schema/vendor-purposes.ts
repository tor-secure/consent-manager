import {
  pgTable,
  timestamp,
  uuid,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

import { vendors } from "./vendors";
import { purposes } from "./purposes";

export const vendorPurposes = pgTable(
  "vendor_purposes",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id, {
        onDelete: "cascade",
      }),

    purposeId: uuid("purpose_id")
      .notNull()
      .references(() => purposes.id, {
        onDelete: "cascade",
      }),

    processingRole: varchar("processing_role", { length: 40 }),

    status: varchar("status", { length: 40 }).notNull().default("active"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("vendor_purposes_vendor_purpose_unique").on(
      table.vendorId,
      table.purposeId,
    ),
  ],
);