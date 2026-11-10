import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  index,
  unique,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";
import { websites } from "./websites";

/**
 * Website-isolated signed-in subject. Ownership key is (websiteId, subjectKey).
 * Email is optional notification metadata — never the ownership key.
 */
export const consentSubjects = pgTable(
  "consent_subjects",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),

    /** Stable user id from Clerk or the customer's authenticated backend. */
    subjectKey: varchar("subject_key", { length: 255 }).notNull(),

    email: varchar("email", { length: 320 }),

    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),

    authSource: varchar("auth_source", { length: 32 }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("consent_subjects_website_subject_unique").on(table.websiteId, table.subjectKey),
    index("consent_subjects_org_idx").on(table.organizationId),
    index("consent_subjects_website_idx").on(table.websiteId),
    index("consent_subjects_email_idx").on(table.email),
  ],
);
