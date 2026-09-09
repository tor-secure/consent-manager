import { index, integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const iabGvlCache = pgTable("iab_gvl_cache", {
  version: integer("version").primaryKey(),
  specificationVersion: integer("specification_version").notNull(),
  tcfPolicyVersion: integer("tcf_policy_version").notNull(),
  sourceUrl: text("source_url").notNull(),
  sha256: varchar("sha256", { length: 64 }).notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  status: varchar("status", { length: 24 }).notNull().default("current"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  validatedAt: timestamp("validated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("iab_gvl_cache_status_idx").on(table.status),
  index("iab_gvl_cache_fetched_idx").on(table.fetchedAt),
]);
