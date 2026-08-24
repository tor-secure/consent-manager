import {
  pgTable,
  timestamp,
  uuid,
  unique,
} from "drizzle-orm/pg-core";

import { roles } from "./roles";
import { permissions } from "./permissions";

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, {
        onDelete: "cascade",
      }),

    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, {
        onDelete: "cascade",
      }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).defaultNow().notNull(),
  },
  (table) => [
    unique("role_permissions_role_permission_unique").on(
      table.roleId,
      table.permissionId,
    ),
  ],
);