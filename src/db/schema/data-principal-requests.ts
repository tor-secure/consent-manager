import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { websites } from "./websites";
import { users } from "./users";

export type RequestType =
  | "access"
  | "correction"
  | "erasure"
  | "portability"
  | "objection"
  | "restriction"
  | "withdraw_consent"
  | "grievance"
  | "nomination";

export type RequestStatus =
  | "received"
  | "verification_pending"
  | "verified"
  | "in_review"
  | "acknowledged"
  | "in_progress"
  | "completed"
  | "rejected"
  | "expired"
  | "cancelled";

export const dataPrincipalRequests = pgTable(
  "data_principal_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    websiteId: uuid("website_id").references(() => websites.id, {
      onDelete: "set null",
    }),

    requestType: varchar("request_type", { length: 50 }).notNull(),

    status: varchar("status", { length: 50 })
      .notNull()
      .default("verification_pending"),

    jurisdiction: varchar("jurisdiction", { length: 32 })
      .notNull()
      .default("dpdp"),

    jurisdictionSnapshot: jsonb("jurisdiction_snapshot")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

    requesterReference: varchar("requester_reference", { length: 32 }),

    requesterName: varchar("requester_name", { length: 255 }).notNull(),

    requesterEmail: varchar("requester_email", { length: 320 }).notNull(),

    requesterPhone: varchar("requester_phone", { length: 50 }),

    requesterKind: varchar("requester_kind", { length: 30 })
      .notNull()
      .default("direct_requester"),

    agentAuthorizationNote: text("agent_authorization_note"),

    consentId: varchar("consent_id", { length: 255 }),

    description: text("description").notNull(),

    responseNotes: text("response_notes"),

    verificationStatus: varchar("verification_status", { length: 40 })
      .notNull()
      .default("pending"),

    verificationMethod: varchar("verification_method", { length: 40 }),

    verificationExpiresAt: timestamp("verification_expires_at", {
      withTimezone: true,
    }),

    verifiedAt: timestamp("verified_at", { withTimezone: true }),

    assignedTo: uuid("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),

    deadlineKind: varchar("deadline_kind", { length: 40 })
      .notNull()
      .default("configured_target"),

    acknowledgeBy: timestamp("acknowledge_by", { withTimezone: true }).notNull(),

    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),

    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),

    completedAt: timestamp("completed_at", { withTimezone: true }),

    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    outcome: jsonb("outcome")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("dpr_organization_idx").on(table.organizationId),
    index("dpr_website_idx").on(table.websiteId),
    index("dpr_status_idx").on(table.status),
    index("dpr_due_at_idx").on(table.dueAt),
    index("dpr_received_at_idx").on(table.receivedAt),
    index("dpr_requester_email_idx").on(table.requesterEmail),
    index("dpr_verification_status_idx").on(table.verificationStatus),
    index("dpr_jurisdiction_idx").on(table.jurisdiction),
    uniqueIndex("dpr_requester_reference_unique").on(table.requesterReference),
  ],
);
