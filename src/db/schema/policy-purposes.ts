import {
  pgTable,
  timestamp,
  uuid,
  unique,
} from "drizzle-orm/pg-core";

import { consentPolicyVersions } from "./consent-policy-versions";
import { purposes } from "./purposes";

export const policyPurposes = pgTable(
  "policy_purposes",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    policyVersionId: uuid("policy_version_id")
      .notNull()
      .references(() => consentPolicyVersions.id, {
        onDelete: "cascade",
      }),

    purposeId: uuid("purpose_id")
      .notNull()
      .references(() => purposes.id, {
        onDelete: "cascade",
      }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("policy_purposes_policy_version_purpose_unique").on(
      table.policyVersionId,
      table.purposeId,
    ),
  ],
);