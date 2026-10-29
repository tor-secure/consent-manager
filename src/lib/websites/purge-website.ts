import "server-only";

import { and, eq, inArray, or } from "drizzle-orm";

import { db } from "@/db";
import { ageAssuranceSessions } from "@/db/schema/age-assurance";
import { californiaOptOutStates } from "@/db/schema/california-opt-out";
import { consentEvidenceSnapshots } from "@/db/schema/consent-evidence-snapshots";
import { consentEvents } from "@/db/schema/consent-events";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { consentRecords } from "@/db/schema/consent-records";
import {
  autopilotPlans,
  digitalTwinSnapshots,
  intelligenceRuns,
  negotiationConfigurations,
  negotiationOutcomes,
  roiConfigurations,
} from "@/db/schema/intelligence";
import { portableConsentExchanges } from "@/db/schema/portable-consent-exchanges";
import { privacyFindings } from "@/db/schema/privacy-findings";
import {
  crossBorderTransfers,
  processingActivities,
} from "@/db/schema/processing-inventory";
import { retentionPolicies } from "@/db/schema/retention-policies";
import { scanResults } from "@/db/schema/scan-results";
import { scans } from "@/db/schema/scans";
import { trackers } from "@/db/schema/trackers";
import { websiteIntegrations } from "@/db/schema/website-integrations";
import { websiteJurisdictionRules } from "@/db/schema/website-jurisdiction-rules";
import { websiteScanSchedules } from "@/db/schema/website-scan-schedules";
import { websites } from "@/db/schema/websites";

function releasedDomain(id: string, domain: string) {
  const stamp = id.replace(/-/g, "").slice(0, 12);
  const base = domain
    .trim()
    .toLowerCase()
    .replace(/\.deleted\.[a-z0-9]+$/i, "")
    .slice(0, 200);
  return `${base}.deleted.${stamp}`;
}

/**
 * Removes website-scoped CMP data, then soft-deletes the website row.
 * Organisation vendors and purposes are kept (they are shared across sites).
 */
export async function purgeWebsiteAndRelatedData(input: {
  websiteId: string;
  organizationId: string;
  domain: string;
}) {
  const { websiteId, organizationId, domain } = input;
  const now = new Date();

  await db.transaction(async (tx) => {
    const policyRows = await tx
      .select({ id: consentPolicies.id })
      .from(consentPolicies)
      .where(eq(consentPolicies.websiteId, websiteId));
    const policyIds = policyRows.map((row) => row.id);

    const versionRows =
      policyIds.length > 0
        ? await tx
            .select({ id: consentPolicyVersions.id })
            .from(consentPolicyVersions)
            .where(inArray(consentPolicyVersions.policyId, policyIds))
        : [];
    const versionIds = versionRows.map((row) => row.id);

    // Evidence / events / records reference policies and versions with RESTRICT.
    await tx.delete(consentEvidenceSnapshots).where(eq(consentEvidenceSnapshots.websiteId, websiteId));
    await tx.delete(consentEvents).where(eq(consentEvents.websiteId, websiteId));
    await tx.delete(consentRecords).where(eq(consentRecords.websiteId, websiteId));

    await tx
      .delete(portableConsentExchanges)
      .where(
        or(
          eq(portableConsentExchanges.sourceWebsiteId, websiteId),
          eq(portableConsentExchanges.targetWebsiteId, websiteId),
        ),
      );

    if (policyIds.length > 0) {
      await tx
        .update(consentPolicies)
        .set({ liveVersionId: null, updatedAt: now })
        .where(inArray(consentPolicies.id, policyIds));
    }
    if (versionIds.length > 0) {
      await tx.delete(consentPolicyVersions).where(inArray(consentPolicyVersions.id, versionIds));
    }
    if (policyIds.length > 0) {
      await tx.delete(consentPolicies).where(inArray(consentPolicies.id, policyIds));
    }

    await tx.delete(trackers).where(eq(trackers.websiteId, websiteId));
    await tx.delete(scanResults).where(eq(scanResults.websiteId, websiteId));
    await tx.delete(scans).where(eq(scans.websiteId, websiteId));
    await tx.delete(websiteScanSchedules).where(eq(websiteScanSchedules.websiteId, websiteId));
    await tx.delete(websiteJurisdictionRules).where(eq(websiteJurisdictionRules.websiteId, websiteId));
    await tx.delete(websiteIntegrations).where(eq(websiteIntegrations.websiteId, websiteId));
    await tx.delete(ageAssuranceSessions).where(eq(ageAssuranceSessions.websiteId, websiteId));
    await tx.delete(californiaOptOutStates).where(eq(californiaOptOutStates.websiteId, websiteId));
    await tx.delete(privacyFindings).where(eq(privacyFindings.websiteId, websiteId));
    await tx.delete(processingActivities).where(eq(processingActivities.websiteId, websiteId));
    await tx.delete(crossBorderTransfers).where(eq(crossBorderTransfers.websiteId, websiteId));
    await tx.delete(retentionPolicies).where(eq(retentionPolicies.websiteId, websiteId));
    await tx.delete(intelligenceRuns).where(eq(intelligenceRuns.websiteId, websiteId));
    await tx.delete(digitalTwinSnapshots).where(eq(digitalTwinSnapshots.websiteId, websiteId));
    await tx.delete(autopilotPlans).where(eq(autopilotPlans.websiteId, websiteId));
    await tx.delete(roiConfigurations).where(eq(roiConfigurations.websiteId, websiteId));
    await tx.delete(negotiationConfigurations).where(eq(negotiationConfigurations.websiteId, websiteId));
    await tx.delete(negotiationOutcomes).where(eq(negotiationOutcomes.websiteId, websiteId));

    const updated = await tx
      .update(websites)
      .set({
        status: "inactive",
        deletedAt: now,
        domain: releasedDomain(websiteId, domain),
        updatedAt: now,
      })
      .where(and(eq(websites.id, websiteId), eq(websites.organizationId, organizationId)))
      .returning({ id: websites.id });

    if (updated.length === 0) {
      throw new Error("Website not found during purge");
    }
  });
}
