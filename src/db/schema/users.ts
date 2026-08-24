import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Clerk's unique user identifier
  clerkUserId: varchar("clerk_user_id", {
    length: 255,
  }).notNull().unique(),

  email: varchar("email", {
    length: 320,
  }).notNull().unique(),

  name: varchar("name", {
    length: 255,
  }).notNull(),

  avatarUrl: text("avatar_url"),

  status: varchar("status", {
    length: 50,
  })
    .notNull()
    .default("active"),

  emailVerifiedAt: timestamp("email_verified_at", {
    withTimezone: true,
  }),

  lastLoginAt: timestamp("last_login_at", {
    withTimezone: true,
  }),

  timezone: varchar("timezone", {
    length: 100,
  })
    .notNull()
    .default("UTC"),

  locale: varchar("locale", {
    length: 20,
  })
    .notNull()
    .default("en"),

  metadata: jsonb("metadata")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),

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