import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentRecords } from "@/db/schema/consent-records";
import { purposes } from "@/db/schema/purposes";
import { websites } from "@/db/schema/websites";
import type { GapCmp } from "./gap-document";

export async function loadGapCmpSnapshot(organizationId: string): Promise<GapCmp | null> {
  try {
    const [records, policies, purposeRows] = await Promise.all([
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(consentRecords)
        .where(eq(consentRecords.organizationId, organizationId)),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(consentPolicyVersions)
        .innerJoin(consentPolicies, eq(consentPolicyVersions.policyId, consentPolicies.id))
        .innerJoin(websites, eq(consentPolicies.websiteId, websites.id))
        .where(and(eq(websites.organizationId, organizationId), eq(consentPolicyVersions.isPublished, true))),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(purposes)
        .where(eq(purposes.organizationId, organizationId)),
    ]);
    return {
      consentRecords: Number(records[0]?.total ?? 0),
      publishedPolicies: Number(policies[0]?.total ?? 0),
      purposes: Number(purposeRows[0]?.total ?? 0),
    };
  } catch {
    return null;
  }
}
