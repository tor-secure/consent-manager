import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  index,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { websites } from "./websites";

// ---------------------------------------------------------------------------
// data_principal_requests
//
// Records rights requests submitted by Data Principals under DPDP 2023
// §11 (access), §12 (correction / erasure), §13 (grievance), and §14
// (nomination). No login required from the Data Principal — intake is a
// public API endpoint.
//
// SLA obligations per DPDP Rules 2025 Rule 12:
//   • acknowledgedAt must be ≤ 48 hours after receivedAt
//   • completedAt must be ≤ 30 days after receivedAt
// Both deadlines are pre-computed and stored as acknowledgeBy / dueAt so that
// the dashboard can surface SLA breaches without arithmetic at render time.
// ---------------------------------------------------------------------------

export type RequestType = "access" | "correction" | "erasure" | "grievance" | "nomination";
export type RequestStatus = "received" | "acknowledged" | "in_progress" | "completed" | "rejected";

export const dataPrincipalRequests = pgTable(
  "data_principal_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // ── Tenant scope ────────────────────────────────────────────────────
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    websiteId: uuid("website_id")
      .references(() => websites.id, { onDelete: "set null" }),

    // ── Request classification ──────────────────────────────────────────
    // access | correction | erasure | grievance | nomination
    requestType: varchar("request_type", { length: 50 }).notNull(),

    // received | acknowledged | in_progress | completed | rejected
    status: varchar("status", { length: 50 }).notNull().default("received"),

    // ── Requester identity (Data Principal) ─────────────────────────────
    // Stored as-is; production deployments should encrypt these columns at
    // rest via a KMS-backed encrypted column extension.
    requesterName: varchar("requester_name", { length: 255 }).notNull(),

    requesterEmail: varchar("requester_email", { length: 320 }).notNull(),

    requesterPhone: varchar("requester_phone", { length: 50 }),

    // ── Optional link to existing consent record ─────────────────────────
    // If the requester supplies their consentId we can look up exactly what
    // data is held and fulfil access/erasure requests efficiently.
    consentId: varchar("consent_id", { length: 255 }),

    // ── Request content ──────────────────────────────────────────────────
    description: text("description").notNull(),

    // Operator's internal response / resolution notes (never sent to requester
    // automatically in this release — email delivery is out of scope).
    responseNotes: text("response_notes"),

    // ── SLA timestamps ──────────────────────────────────────────────────
    // Acknowledgement deadline: receivedAt + 48 hours (Rule 12(2))
    acknowledgeBy: timestamp("acknowledge_by", { withTimezone: true }).notNull(),

    // Response deadline: receivedAt + 30 days (Rule 12(3))
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),

    // When the operator actually acknowledged the request
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),

    // When the request was fully resolved (completed or rejected)
    completedAt: timestamp("completed_at", { withTimezone: true }),

    // ── Audit ───────────────────────────────────────────────────────────
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
  ],
);
