import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { users } from "./users";
import { dataPrincipalRequests } from "./data-principal-requests";

export const rightsRequestExports = pgTable(
  "rights_request_exports",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    requestId: uuid("request_id")
      .notNull()
      .references(() => dataPrincipalRequests.id, { onDelete: "cascade" }),

    exportKind: varchar("export_kind", { length: 30 }).notNull(),

    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull(),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    accessedAt: timestamp("accessed_at", { withTimezone: true }),
  },
  (table) => [
    index("rights_exports_org_idx").on(table.organizationId),
    index("rights_exports_request_idx").on(table.requestId),
    index("rights_exports_expiry_idx").on(table.expiresAt),
  ],
);
