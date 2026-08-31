import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Clerk organization ID
  clerkOrganizationId: varchar("clerk_organization_id", {
    length: 255,
  }).notNull().unique(),

  name: varchar("name", {
    length: 255,
  }).notNull(),

  slug: varchar("slug", {
    length: 255,
  }).notNull().unique(),

  description: text("description"),

  logoUrl: text("logo_url"),

  status: varchar("status", {
    length: 50,
  })
    .notNull()
    .default("active"),

  timezone: varchar("timezone", {
    length: 100,
  })
    .notNull()
    .default("UTC"),

  defaultLanguage: varchar("default_language", {
    length: 10,
  })
    .notNull()
    .default("en"),

  defaultRegion: varchar("default_region", {
    length: 10,
  }),

  settings: jsonb("settings")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),

  onboardingCompleted: boolean("onboarding_completed")
    .notNull()
    .default(false),

  // ── DPDP Rules 2025 Rule 3(1)(d) — Contact mechanism fields ─────────────
  // These are included in the public SDK config response so the consent
  // banner / Preference Center can display the required contact details.

  dpoName: varchar("dpo_name", { length: 255 }),

  dpoEmail: varchar("dpo_email", { length: 320 }),

  grievanceOfficerName: varchar("grievance_officer_name", { length: 255 }),

  grievanceOfficerEmail: varchar("grievance_officer_email", { length: 320 }),

  grievancePortalUrl: text("grievance_portal_url"),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  deletedAt: timestamp("deleted_at", {
    withTimezone: true,
  }),
});