import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  index,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { websites } from "./websites";
import { consentSubjects } from "./consent-subjects";

export const consentSubjectSessions = pgTable(
  "consent_subject_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),

    subjectId: uuid("subject_id")
      .notNull()
      .references(() => consentSubjects.id, { onDelete: "cascade" }),

    /** SHA-256 hex of the opaque subjectSessionToken. */
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    revokedAt: timestamp("revoked_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("consent_subject_sessions_token_hash_idx").on(table.tokenHash),
    index("consent_subject_sessions_subject_idx").on(table.subjectId),
    index("consent_subject_sessions_website_idx").on(table.websiteId),
  ],
);
