import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { consentPolicies } from "./consent-policies";
import { consentPolicyVersions } from "./consent-policy-versions";
import { organizations } from "./organizations";
import { websites } from "./websites";
import type { PolicyNoticeSnapshot } from "../../lib/policy-context";

/**
 * One WhatsApp OTP consent attempt. The OTP proves the phone number only.
 * The decision itself is stored in consent_records with source "whatsapp".
 *
 * Status lifecycle:
 *   otp_sent -> verified -> completed
 *   otp_sent -> failed   (too many wrong codes or send failure)
 *   otp_sent -> expired  (OTP window passed)
 */
export const whatsappConsentChallenges = pgTable(
  "whatsapp_consent_challenges",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),

    policyId: uuid("policy_id")
      .notNull()
      .references(() => consentPolicies.id, { onDelete: "restrict" }),

    policyVersionId: uuid("policy_version_id")
      .notNull()
      .references(() => consentPolicyVersions.id, { onDelete: "restrict" }),

    policyVersionNumber: integer("policy_version_number").notNull(),

    jurisdiction: varchar("jurisdiction", { length: 100 }).notNull(),

    locale: varchar("locale", { length: 35 }).notNull(),

    noticeHash: varchar("notice_hash", { length: 64 }).notNull(),

    noticeSnapshot: jsonb("notice_snapshot").$type<PolicyNoticeSnapshot>().notNull(),

    phoneE164: varchar("phone_e164", { length: 20 }).notNull(),

    phoneHash: varchar("phone_hash", { length: 64 }).notNull(),

    phoneLast4: varchar("phone_last4", { length: 4 }).notNull(),

    otpHash: varchar("otp_hash", { length: 64 }).notNull(),

    sessionTokenHash: varchar("session_token_hash", { length: 64 }),

    status: varchar("status", { length: 20 }).notNull().default("otp_sent"),

    attemptCount: integer("attempt_count").notNull().default(0),

    sendCount: integer("send_count").notNull().default(1),

    otpExpiresAt: timestamp("otp_expires_at", { withTimezone: true }).notNull(),

    resendAvailableAt: timestamp("resend_available_at", { withTimezone: true }).notNull(),

    otpMessageId: varchar("otp_message_id", { length: 255 }),

    otpDeliveryStatus: varchar("otp_delivery_status", { length: 30 }),

    confirmationMessageId: varchar("confirmation_message_id", { length: 255 }),

    consentId: varchar("consent_id", { length: 255 }),

    verifiedAt: timestamp("verified_at", { withTimezone: true }),

    completedAt: timestamp("completed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("whatsapp_consent_challenges_site_phone_idx").on(table.websiteId, table.phoneHash, table.createdAt),
    index("whatsapp_consent_challenges_org_created_idx").on(table.organizationId, table.createdAt),
    index("whatsapp_consent_challenges_otp_message_idx").on(table.otpMessageId),
    index("whatsapp_consent_challenges_consent_idx").on(table.consentId),
  ],
);
