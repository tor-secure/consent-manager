import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { users } from "./users";
import { websites } from "./websites";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const intelligenceRuns = pgTable(
  "intelligence_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").references(() => websites.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    engine: varchar("engine", { length: 50 }).notNull(),
    inputFingerprint: varchar("input_fingerprint", { length: 64 }).notNull(),
    provider: varchar("provider", { length: 100 }).notNull(),
    providerModel: varchar("provider_model", { length: 255 }),
    fallback: boolean("fallback").notNull(),
    deterministicOutput: jsonb("deterministic_output").$type<unknown>().notNull(),
    aiEnrichment: jsonb("ai_enrichment").$type<unknown>().notNull(),
    usage: jsonb("usage").$type<Record<string, number | undefined>>().notNull().default({}),
    ...timestamps,
  },
  (table) => [
    index("intelligence_runs_org_site_created_idx").on(table.organizationId, table.websiteId, table.createdAt),
    index("intelligence_runs_fingerprint_idx").on(table.inputFingerprint),
  ],
);

export const digitalTwinSnapshots = pgTable(
  "digital_twin_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),
    source: varchar("source", { length: 30 }).notNull(),
    sourceId: uuid("source_id"),
    graphHash: varchar("graph_hash", { length: 64 }).notNull(),
    qualityScore: integer("quality_score"),
    inputPayload: jsonb("input_payload").$type<unknown>().notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("digital_twin_site_created_idx").on(table.organizationId, table.websiteId, table.createdAt),
    uniqueIndex("digital_twin_source_unique").on(table.websiteId, table.source, table.sourceId),
  ],
);

export const autopilotPlans = pgTable(
  "autopilot_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    status: varchar("status", { length: 30 }).notNull().default("draft"),
    version: integer("version").notNull().default(1),
    baselineFingerprint: varchar("baseline_fingerprint", { length: 64 }).notNull(),
    plan: jsonb("plan").$type<unknown>().notNull(),
    rollbackState: jsonb("rollback_state").$type<unknown>(),
    ...timestamps,
  },
  (table) => [index("autopilot_plans_site_idx").on(table.organizationId, table.websiteId, table.createdAt)],
);

export const roiConfigurations = pgTable(
  "roi_configurations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").references(() => websites.id, { onDelete: "cascade" }),
    monthlySessions: integer("monthly_sessions"),
    valuePerConversion: doublePrecision("value_per_conversion"),
    valuePerConsent: doublePrecision("value_per_consent"),
    implementationCost: doublePrecision("implementation_cost"),
    recurringMonthlyCost: doublePrecision("recurring_monthly_cost"),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    targetScore: integer("target_score").notNull().default(85),
    updatedByUserId: uuid("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [uniqueIndex("roi_configuration_scope_unique").on(table.organizationId, table.websiteId)],
);

export const negotiationConfigurations = pgTable(
  "negotiation_configurations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(false),
    offers: jsonb("offers").$type<unknown[]>().notNull().default([]),
    constraints: jsonb("constraints").$type<Record<string, unknown>>().notNull().default({}),
    updatedByUserId: uuid("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [uniqueIndex("negotiation_configuration_site_unique").on(table.websiteId)],
);

export const negotiationOutcomes = pgTable(
  "negotiation_outcomes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),
    offerKey: varchar("offer_key", { length: 100 }).notNull(),
    outcome: varchar("outcome", { length: 30 }).notNull(),
    purposeKeys: jsonb("purpose_keys").$type<string[]>().notNull().default([]),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("negotiation_outcomes_site_time_idx").on(table.organizationId, table.websiteId, table.occurredAt)],
);
