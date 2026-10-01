import { index, integer, jsonb, pgTable, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { websites } from "./websites";
import { trackers } from "./trackers";
import { vendors } from "./vendors";
import { purposes } from "./purposes";

/** A sanitized fact emitted by the browser SDK. It is evidence, never a conclusion. */
export const runtimeDiscoveryObservations = pgTable("runtime_discovery_observations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  websiteId: uuid("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),
  trackerId: uuid("tracker_id").references(() => trackers.id, { onDelete: "set null" }),
  vendorId: uuid("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
  purposeId: uuid("purpose_id").references(() => purposes.id, { onDelete: "set null" }),
  eventId: varchar("event_id", { length: 64 }).notNull(),
  observationType: varchar("observation_type", { length: 32 }).notNull(),
  evidenceStatus: varchar("evidence_status", { length: 16 }).notNull().default("observed"),
  discoverySource: varchar("discovery_source", { length: 80 }).notNull().default("cmp_sdk_runtime"),
  pageUrl: varchar("page_url", { length: 512 }).notNull(),
  pageOrigin: varchar("page_origin", { length: 253 }).notNull(),
  destinationHost: varchar("destination_host", { length: 253 }),
  resourcePath: varchar("resource_path", { length: 512 }),
  resourceType: varchar("resource_type", { length: 32 }),
  requestMethod: varchar("request_method", { length: 12 }),
  initiator: varchar("initiator", { length: 512 }),
  party: varchar("party", { length: 16 }).notNull().default("unknown"),
  navigationType: varchar("navigation_type", { length: 32 }),
  storageKey: varchar("storage_key", { length: 255 }),
  consentState: jsonb("consent_state").$type<Record<string, boolean>>().notNull().default({}),
  sanitizationStatus: varchar("sanitization_status", { length: 16 }).notNull().default("sanitized"),
  confidence: integer("confidence").notNull().default(100),
  metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null>>().notNull().default({}),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("runtime_discovery_site_event_unique").on(table.websiteId, table.eventId),
  index("runtime_discovery_org_observed_idx").on(table.organizationId, table.observedAt),
  index("runtime_discovery_site_page_idx").on(table.websiteId, table.pageUrl),
  index("runtime_discovery_destination_idx").on(table.websiteId, table.destinationHost),
]);
