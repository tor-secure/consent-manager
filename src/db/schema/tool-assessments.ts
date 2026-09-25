import { integer, jsonb, pgTable, timestamp, uuid, varchar, index } from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { users } from "./users";

export const toolAssessments = pgTable(
  "tool_assessments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    toolType: varchar("tool_type", { length: 40 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("completed"),
    score: integer("score"),
    methodologyVersion: varchar("methodology_version", { length: 32 }).notNull(),
    answers: jsonb("answers").$type<Record<string, string>>().notNull().default({}),
    result: jsonb("result").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("tool_assessments_org_tool_idx").on(table.organizationId, table.toolType, table.updatedAt),
  ],
);
