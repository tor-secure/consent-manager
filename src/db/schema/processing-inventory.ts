import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { websites } from "./websites";
import { vendors } from "./vendors";
import { purposes } from "./purposes";
import { dataPrincipalRequests } from "./data-principal-requests";

export const processingActivities = pgTable(
  "processing_activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").references(() => websites.id, { onDelete: "cascade" }),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    purposeId: uuid("purpose_id").references(() => purposes.id, { onDelete: "set null" }),
    description: text("description"),
    dataCategories: jsonb("data_categories").$type<string[]>().notNull().default([]),
    sensitive: boolean("sensitive").notNull().default(false),
    sourceOfData: varchar("source_of_data", { length: 255 }),
    recipients: jsonb("recipients").$type<string[]>().notNull().default([]),
    retentionPeriod: varchar("retention_period", { length: 255 }),
    processingRole: varchar("processing_role", { length: 40 }).notNull().default("unknown"),
    processingLocation: varchar("processing_location", { length: 100 }),
    transferRequired: boolean("transfer_required").notNull().default(false),
    legalBasis: varchar("legal_basis", { length: 50 }),
    ccpaSale: varchar("ccpa_sale", { length: 40 }).notNull().default("unknown"),
    ccpaShare: varchar("ccpa_share", { length: 40 }).notNull().default("unknown"),
    ccpaSensitivePi: varchar("ccpa_sensitive_pi", { length: 40 })
      .notNull()
      .default("unknown"),
    status: varchar("status", { length: 40 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("processing_activities_org_idx").on(table.organizationId),
    index("processing_activities_website_idx").on(table.websiteId),
    index("processing_activities_vendor_idx").on(table.vendorId),
  ],
);

export const vendorRelationships = pgTable(
  "vendor_relationships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    parentVendorId: uuid("parent_vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    childVendorId: uuid("child_vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    relationshipType: varchar("relationship_type", { length: 40 }).notNull(),
    status: varchar("status", { length: 40 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("vendor_relationships_org_idx").on(table.organizationId),
    index("vendor_relationships_parent_idx").on(table.parentVendorId),
    index("vendor_relationships_child_idx").on(table.childVendorId),
    unique("vendor_relationships_pair_unique").on(
      table.organizationId,
      table.parentVendorId,
      table.childVendorId,
      table.relationshipType,
    ),
  ],
);

export const crossBorderTransfers = pgTable(
  "cross_border_transfers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").references(() => websites.id, { onDelete: "cascade" }),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    processingActivityId: uuid("processing_activity_id").references(
      () => processingActivities.id,
      { onDelete: "set null" },
    ),
    sourceCountry: varchar("source_country", { length: 8 }),
    destinationCountry: varchar("destination_country", { length: 8 }),
    destinationRegion: varchar("destination_region", { length: 32 }),
    destinationType: varchar("destination_type", { length: 40 }).notNull().default("vendor"),
    transferPurpose: varchar("transfer_purpose", { length: 255 }),
    dataCategories: jsonb("data_categories").$type<string[]>().notNull().default([]),
    processingLocation: varchar("processing_location", { length: 100 }),
    mechanism: varchar("mechanism", { length: 40 }).notNull().default("not_configured"),
    safeguards: text("safeguards"),
    documentationRef: varchar("documentation_ref", { length: 255 }),
    notes: text("notes"),
    effectiveAt: timestamp("effective_at", { withTimezone: true }),
    reviewAt: timestamp("review_at", { withTimezone: true }),
    status: varchar("status", { length: 40 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("transfers_org_idx").on(table.organizationId),
    index("transfers_website_idx").on(table.websiteId),
    index("transfers_vendor_idx").on(table.vendorId),
  ],
);

export const rightsDownstreamActions = pgTable(
  "rights_downstream_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    requestId: uuid("request_id")
      .notNull()
      .references(() => dataPrincipalRequests.id, { onDelete: "cascade" }),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "restrict" }),
    processingActivityId: uuid("processing_activity_id").references(
      () => processingActivities.id,
      { onDelete: "set null" },
    ),
    actionRequired: boolean("action_required").notNull().default(false),
    status: varchar("status", { length: 40 }).notNull().default("not_required"),
    reference: varchar("reference", { length: 255 }),
    requestedAt: timestamp("requested_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("rights_downstream_org_idx").on(table.organizationId),
    index("rights_downstream_request_idx").on(table.requestId),
    index("rights_downstream_vendor_idx").on(table.vendorId),
    unique("rights_downstream_request_vendor_unique").on(table.requestId, table.vendorId),
  ],
);
