import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { websites } from "./websites";
import { consentPolicyVersions } from "./consent-policy-versions";
import { consentSessions } from "./consent-sessions";

export type ExperimentVariant = {
  id: string;
  label: string;
  weight: number;
  overrides: Record<string, string | number>;
};

export const experiments = pgTable("experiments", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  websiteId: uuid("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),
  policyVersionId: uuid("policy_version_id").notNull().references(() => consentPolicyVersions.id, { onDelete: "restrict" }),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description").notNull().default(""),
  status: varchar("status", { length: 20 }).notNull().default("DRAFT"),
  variants: jsonb("variants").$type<ExperimentVariant[]>().notNull(),
  controlVariantId: varchar("control_variant_id", { length: 40 }).notNull(),
  allocation: jsonb("allocation").$type<Record<string, number>>().notNull(),
  scheduledStartAt: timestamp("scheduled_start_at", { withTimezone: true }),
  scheduledEndAt: timestamp("scheduled_end_at", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("experiments_org_site_status_idx").on(t.organizationId, t.websiteId, t.status),
  index("experiments_site_policy_idx").on(t.websiteId, t.policyVersionId),
]);

export const experimentEvents = pgTable("experiment_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  websiteId: uuid("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),
  experimentId: uuid("experiment_id").notNull().references(() => experiments.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").references(() => consentSessions.id, { onDelete: "set null" }),
  visitorHash: varchar("visitor_hash", { length: 64 }),
  eventId: varchar("event_id", { length: 80 }).notNull(),
  eventType: varchar("event_type", { length: 24 }).notNull(),
  variantId: varchar("variant_id", { length: 40 }).notNull(),
  choice: varchar("choice", { length: 20 }),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("experiment_events_dedupe_idx").on(t.experimentId, t.eventId),
  index("experiment_events_org_experiment_time_idx").on(t.organizationId, t.experimentId, t.occurredAt),
  index("experiment_events_session_idx").on(t.sessionId),
  index("experiment_events_variant_type_idx").on(t.experimentId, t.variantId, t.eventType),
]);
