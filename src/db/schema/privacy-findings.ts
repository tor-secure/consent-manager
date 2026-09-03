import {
  index,
  jsonb,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { websites } from "./websites";
import { trackers } from "./trackers";
import { vendors } from "./vendors";
import { purposes } from "./purposes";
import { users } from "./users";
import { scans } from "./scans";

export type PrivacyFindingDetails = {
  whatChanged: string;
  previousState: Record<string, unknown>;
  currentState: Record<string, unknown>;
  whyItMatters: string;
  whatIsAffected: string;
  recommendedAction: string;
  subjectKey?: string;
  scanId?: string | null;
  previousScanId?: string | null;
  expectedState?: Record<string, unknown>;
  observedState?: Record<string, unknown>;
  evidenceSource?: "static_html" | "cmp_configuration" | "scan_inventory";
  evidenceClass?: "suspected_execution" | "configuration_mismatch" | "confirmed_execution";
  pageUrl?: string | null;
};

export const privacyFindings = pgTable(
  "privacy_findings",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),

    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, {
        onDelete: "cascade",
      }),

    findingType: varchar("finding_type", { length: 80 }).notNull(),

    severity: varchar("severity", { length: 20 }).notNull(),

    status: varchar("status", { length: 20 }).notNull().default("open"),

    trackerId: uuid("tracker_id").references(() => trackers.id, {
      onDelete: "set null",
    }),

    vendorId: uuid("vendor_id").references(() => vendors.id, {
      onDelete: "set null",
    }),

    purposeId: uuid("purpose_id").references(() => purposes.id, {
      onDelete: "set null",
    }),

    fingerprint: varchar("fingerprint", { length: 64 }).notNull(),

    title: varchar("title", { length: 255 }).notNull(),

    details: jsonb("details")
      .$type<PrivacyFindingDetails>()
      .notNull()
      .default({
        whatChanged: "",
        previousState: {},
        currentState: {},
        whyItMatters: "",
        whatIsAffected: "",
        recommendedAction: "",
      }),

    firstDetectedAt: timestamp("first_detected_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    lastDetectedAt: timestamp("last_detected_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    lastScanId: uuid("last_scan_id").references(() => scans.id, {
      onDelete: "set null",
    }),

    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),

    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),

    resolvedAt: timestamp("resolved_at", { withTimezone: true }),

    resolvedBy: uuid("resolved_by").references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("privacy_findings_org_fingerprint_unique").on(
      table.organizationId,
      table.fingerprint,
    ),
    index("privacy_findings_organization_idx").on(table.organizationId),
    index("privacy_findings_website_idx").on(table.websiteId),
    index("privacy_findings_status_idx").on(table.status),
    index("privacy_findings_severity_idx").on(table.severity),
    index("privacy_findings_type_idx").on(table.findingType),
  ],
);
