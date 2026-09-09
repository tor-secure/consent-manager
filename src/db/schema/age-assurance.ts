import {
  boolean,
  index,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { websites } from "./websites";

export const ageAssuranceSessions = pgTable(
  "age_assurance_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    consentId: varchar("consent_id", { length: 255 }),
    ageStatus: varchar("age_status", { length: 40 }).notNull().default("unknown"),
    ageBand: varchar("age_band", { length: 20 }).notNull().default("unknown"),
    assuranceMethod: varchar("assurance_method", { length: 40 }),
    assertedOverThreshold: boolean("asserted_over_threshold"),
    guardianRequired: boolean("guardian_required").notNull().default(false),
    guardianStatus: varchar("guardian_status", { length: 40 }).notNull().default("none"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("age_sessions_org_idx").on(table.organizationId),
    index("age_sessions_website_idx").on(table.websiteId),
    index("age_sessions_consent_idx").on(table.consentId),
  ],
);

export const guardianAuthorizationRequests = pgTable(
  "guardian_authorization_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => ageAssuranceSessions.id, { onDelete: "cascade" }),
    purpose: varchar("purpose", { length: 30 }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("guardian_requests_token_hash_unique").on(table.tokenHash),
    index("guardian_requests_org_idx").on(table.organizationId),
    index("guardian_requests_session_idx").on(table.sessionId),
  ],
);
