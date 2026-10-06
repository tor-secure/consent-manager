import { boolean, index, jsonb, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { websites } from "./websites";
import { vendors } from "./vendors";
import { purposes } from "./purposes";
import { consentRecords } from "./consent-records";
import { consentSessions } from "./consent-sessions";
import { processingActivities, crossBorderTransfers } from "./processing-inventory";

export const transferRecipientKeys = pgTable("transfer_recipient_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  keyId: varchar("key_id", { length: 80 }).notNull(),
  algorithm: varchar("algorithm", { length: 40 }).notNull().default("X25519-HKDF-SHA256-AES256GCM"),
  publicKeySpki: varchar("public_key_spki", { length: 512 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  validFrom: timestamp("valid_from", { withTimezone: true }).defaultNow().notNull(),
  retiredAt: timestamp("retired_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("transfer_recipient_key_unique").on(t.organizationId, t.vendorId, t.keyId), index("transfer_recipient_keys_vendor_idx").on(t.organizationId, t.vendorId, t.status)]);

export const transferAuthorizations = pgTable("transfer_authorizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  websiteId: uuid("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),
  transferId: uuid("transfer_id").notNull().references(() => crossBorderTransfers.id, { onDelete: "cascade" }),
  processingActivityId: uuid("processing_activity_id").notNull().references(() => processingActivities.id, { onDelete: "restrict" }),
  recipientVendorId: uuid("recipient_vendor_id").notNull().references(() => vendors.id, { onDelete: "restrict" }),
  recipientKeyId: uuid("recipient_key_id").notNull().references(() => transferRecipientKeys.id, { onDelete: "restrict" }),
  consentRecordId: uuid("consent_record_id").notNull().references(() => consentRecords.id, { onDelete: "restrict" }),
  // Keep the issued decision identifier for provenance without restricting Consent Guru's existing consent update lifecycle.
  consentDecisionId: uuid("consent_decision_id").notNull(),
  sessionId: uuid("session_id").references(() => consentSessions.id, { onDelete: "set null" }),
  purposeId: uuid("purpose_id").notNull().references(() => purposes.id, { onDelete: "restrict" }),
  state: varchar("state", { length: 20 }).notNull().default("active"),
  singleUse: boolean("single_use").notNull().default(true),
  issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("transfer_auth_org_site_idx").on(t.organizationId, t.websiteId, t.state), index("transfer_auth_transfer_idx").on(t.transferId, t.state), index("transfer_auth_consent_idx").on(t.consentRecordId)]);

export const secureTransferEnvelopes = pgTable("secure_transfer_envelopes", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  websiteId: uuid("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),
  transferId: uuid("transfer_id").notNull().references(() => crossBorderTransfers.id, { onDelete: "cascade" }),
  authorizationId: uuid("authorization_id").notNull().references(() => transferAuthorizations.id, { onDelete: "restrict" }),
  recipientVendorId: uuid("recipient_vendor_id").notNull().references(() => vendors.id, { onDelete: "restrict" }),
  recipientKeyId: uuid("recipient_key_id").notNull().references(() => transferRecipientKeys.id, { onDelete: "restrict" }),
  idempotencyKey: varchar("idempotency_key", { length: 80 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("ready"),
  envelope: jsonb("envelope").$type<Record<string, unknown>>().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("secure_transfer_idempotency_unique").on(t.organizationId, t.idempotencyKey), index("secure_transfer_org_created_idx").on(t.organizationId, t.createdAt), index("secure_transfer_authorization_idx").on(t.authorizationId)]);
