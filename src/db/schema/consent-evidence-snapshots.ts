import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { websites } from "./websites";
import { consentPolicies } from "./consent-policies";
import { consentPolicyVersions } from "./consent-policy-versions";
import type { PolicyContextClaims, PolicyNoticeSnapshot } from "../../lib/policy-context";

export type ConsentEvidenceDecision = {
  purposeId: string | null;
  vendorId: string | null;
  granted: boolean;
  decision: string;
  decidedAt: string;
};

export const consentEvidenceSnapshots = pgTable(
  "consent_evidence_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),

    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "restrict" }),

    policyId: uuid("policy_id")
      .notNull()
      .references(() => consentPolicies.id, { onDelete: "restrict" }),

    policyVersionId: uuid("policy_version_id")
      .notNull()
      .references(() => consentPolicyVersions.id, { onDelete: "restrict" }),

    policyVersionNumber: integer("policy_version_number").notNull(),

    consentRecordId: uuid("consent_record_id"),

    consentId: varchar("consent_id", { length: 255 }).notNull(),

    submissionId: uuid("submission_id").notNull().unique(),

    requestHash: varchar("request_hash", { length: 64 }).notNull(),

    policyContextId: uuid("policy_context_id").notNull(),

    jurisdiction: varchar("jurisdiction", { length: 100 }).notNull(),

    locale: varchar("locale", { length: 35 }).notNull(),

    variantId: varchar("variant_id", { length: 100 }),

    noticeHash: varchar("notice_hash", { length: 64 }).notNull(),

    choice: varchar("choice", { length: 20 }).notNull(),

    status: varchar("status", { length: 50 }).notNull(),

    stateVersion: integer("state_version").notNull(),

    source: varchar("source", { length: 50 }).notNull().default("web"),

    policyContext: jsonb("policy_context").$type<PolicyContextClaims>().notNull(),

    noticeSnapshot: jsonb("notice_snapshot").$type<PolicyNoticeSnapshot>().notNull(),

    decisions: jsonb("decisions").$type<ConsentEvidenceDecision[]>().notNull(),

    signals: jsonb("signals").$type<Record<string, unknown>>().notNull().default({}),

    evidenceHash: varchar("evidence_hash", { length: 64 }).notNull(),

    evidenceSignature: varchar("evidence_signature", { length: 64 }).notNull(),

    consentedAt: timestamp("consented_at", { withTimezone: true }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("consent_evidence_org_consent_idx").on(
      table.organizationId,
      table.consentId,
      table.consentedAt,
    ),
    index("consent_evidence_record_idx").on(table.consentRecordId),
    index("consent_evidence_context_idx").on(table.policyContextId),
    index("consent_evidence_policy_version_idx").on(table.policyVersionId),
  ],
);
