import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  integer,
  index,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { dataPrincipalRequests } from "./data-principal-requests";

export const rightsRequestVerifications = pgTable(
  "rights_request_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    requestId: uuid("request_id")
      .notNull()
      .references(() => dataPrincipalRequests.id, { onDelete: "cascade" }),

    purpose: varchar("purpose", { length: 30 }).notNull(),

    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    usedAt: timestamp("used_at", { withTimezone: true }),

    failedAttempts: integer("failed_attempts").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("rights_verifications_org_idx").on(table.organizationId),
    index("rights_verifications_request_idx").on(table.requestId),
    index("rights_verifications_hash_idx").on(table.tokenHash),
  ],
);
