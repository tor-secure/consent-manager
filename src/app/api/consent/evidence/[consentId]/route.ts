import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { consentRecords } from "@/db/schema/consent-records";
import { consentDecisions } from "@/db/schema/consent-decisions";
import { consentEvents } from "@/db/schema/consent-events";
import { consentEvidenceSnapshots } from "@/db/schema/consent-evidence-snapshots";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { consentPolicies } from "@/db/schema/consent-policies";
import { purposes } from "@/db/schema/purposes";
import { vendors } from "@/db/schema/vendors";
import {
  resolveActiveMembership,
  resolveLocalOrganization,
  resolveLocalUser,
} from "@/lib/api-auth-helpers";
import {
  createConsentCryptoProof,
  readStoredCryptoProof,
  verifyConsentCryptoProof,
  verifyHistoricalConsentEvidenceProof,
} from "@/lib/consent-proof";

function serializeSnapshot(snapshot: typeof consentEvidenceSnapshots.$inferSelect) {
  const evidence = {
    organizationId: snapshot.organizationId,
    websiteId: snapshot.websiteId,
    consentId: snapshot.consentId,
    policyId: snapshot.policyId,
    policyVersionId: snapshot.policyVersionId,
    policyVersionNumber: snapshot.policyVersionNumber,
    policyContextId: snapshot.policyContextId,
    jurisdiction: snapshot.jurisdiction,
    locale: snapshot.locale,
    noticeHash: snapshot.noticeHash,
    noticeSnapshot: snapshot.noticeSnapshot,
    choice: snapshot.choice,
    status: snapshot.status,
    source: snapshot.source,
    decisions: snapshot.decisions,
    consentedAt: snapshot.consentedAt.toISOString(),
  };
  return {
    id: snapshot.id,
    ...evidence,
    variantId: snapshot.variantId ?? snapshot.policyContext.variantId ?? null,
    consentRecordId: snapshot.consentRecordId,
    stateVersion: snapshot.stateVersion,
    submissionId: snapshot.submissionId,
    policyContext: snapshot.policyContext,
    requestHash: snapshot.requestHash,
    signals: snapshot.signals,
    createdAt: snapshot.createdAt,
    proof: {
      hash: snapshot.evidenceHash,
      signature: snapshot.evidenceSignature,
      verification: verifyHistoricalConsentEvidenceProof({
        evidence,
        hash: snapshot.evidenceHash,
        signature: snapshot.evidenceSignature,
      }),
    },
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ consentId: string }> },
) {
  try {
    const { consentId } = await params;
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const localUser = await resolveLocalUser(userId);
    if (!localUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const organization = await resolveLocalOrganization(orgId);
    if (!organization) {
      return NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 });
    }

    const membership = await resolveActiveMembership(organization.id, localUser.id);
    if (!membership) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const [record] = await db
      .select()
      .from(consentRecords)
      .where(
        and(
          eq(consentRecords.consentId, consentId),
          eq(consentRecords.organizationId, organization.id),
        ),
      )
      .limit(1);

    const history = await db
      .select()
      .from(consentEvidenceSnapshots)
      .where(
        and(
          eq(consentEvidenceSnapshots.organizationId, organization.id),
          eq(consentEvidenceSnapshots.consentId, consentId),
        ),
      )
      .orderBy(consentEvidenceSnapshots.consentedAt);

    if (!record && history.length === 0) {
      return NextResponse.json({ success: false, message: "Consent evidence not found" }, { status: 404 });
    }

    const websiteId = record?.websiteId ?? history[0]?.websiteId;
    const [website] = websiteId
      ? await db
          .select({ id: websites.id, name: websites.name, domain: websites.domain, siteKey: websites.siteKey })
          .from(websites)
          .where(and(eq(websites.id, websiteId), eq(websites.organizationId, organization.id)))
          .limit(1)
      : [];

    const events = record
      ? await db
          .select({
            id: consentEvents.id,
            eventType: consentEvents.eventType,
            eventData: consentEvents.eventData,
            source: consentEvents.source,
            occurredAt: consentEvents.occurredAt,
          })
          .from(consentEvents)
          .where(eq(consentEvents.consentRecordId, record.id))
          .orderBy(consentEvents.occurredAt)
      : await db
          .select({
            id: consentEvents.id,
            eventType: consentEvents.eventType,
            eventData: consentEvents.eventData,
            source: consentEvents.source,
            occurredAt: consentEvents.occurredAt,
          })
          .from(consentEvents)
          .where(
            and(
              eq(consentEvents.organizationId, organization.id),
              eq(consentEvents.consentId, consentId),
            ),
          )
          .orderBy(consentEvents.occurredAt);

    if (!record) {
      const latest = history[history.length - 1];
      return NextResponse.json({
        success: true,
        currentStateDeleted: true,
        evidence: {
          consentId,
          visitorId: null,
          status: latest?.status ?? "deleted",
          source: latest?.source ?? "web",
          jurisdiction: latest?.jurisdiction ?? null,
          consentedAt: latest?.consentedAt ?? null,
          expiresAt: null,
          withdrawnAt: null,
          createdAt: latest?.createdAt ?? null,
          updatedAt: null,
          website: website
            ? { id: website.id, name: website.name, domain: website.domain, siteKey: website.siteKey }
            : null,
          policyVersion: latest
            ? {
                id: latest.policyVersionId,
                version: latest.policyVersionNumber,
                policyName: latest.noticeSnapshot.policy.name,
                isPublished: null,
                publishedAt: null,
              }
            : null,
          noticeSnapshot: latest?.noticeSnapshot ?? null,
          decisions: latest?.decisions ?? [],
          events: events.map((e) => ({
            id: e.id,
            eventType: e.eventType,
            eventData: e.eventData,
            source: e.source,
            occurredAt: e.occurredAt,
          })),
          proof: null,
          history: history.map(serializeSnapshot),
        },
      });
    }

    const [policyVersion] = await db
      .select({
        id: consentPolicyVersions.id,
        version: consentPolicyVersions.version,
        isPublished: consentPolicyVersions.isPublished,
        publishedAt: consentPolicyVersions.publishedAt,
        policyId: consentPolicyVersions.policyId,
      })
      .from(consentPolicyVersions)
      .where(eq(consentPolicyVersions.id, record.policyVersionId))
      .limit(1);

    let policyName: string | null = null;
    if (policyVersion) {
      const [policy] = await db
        .select({ name: consentPolicies.name })
        .from(consentPolicies)
        .where(eq(consentPolicies.id, policyVersion.policyId))
        .limit(1);
      policyName = policy?.name ?? null;
    }

    const decisions = await db
      .select({
        id: consentDecisions.id,
        purposeId: consentDecisions.purposeId,
        vendorId: consentDecisions.vendorId,
        decision: consentDecisions.decision,
        granted: consentDecisions.granted,
        decidedAt: consentDecisions.decidedAt,
      })
      .from(consentDecisions)
      .where(eq(consentDecisions.consentRecordId, record.id));

    const purposeIds = [...new Set(decisions.map((d) => d.purposeId).filter(Boolean) as string[])];
    const vendorIds = [...new Set(decisions.map((d) => d.vendorId).filter(Boolean) as string[])];

    const [purposeRows, vendorRows] = await Promise.all([
      purposeIds.length > 0
        ? db.select({ id: purposes.id, key: purposes.key, name: purposes.name })
            .from(purposes)
            .where(inArray(purposes.id, purposeIds))
        : Promise.resolve([]),
      vendorIds.length > 0
        ? db.select({ id: vendors.id, name: vendors.name, domain: vendors.domain })
            .from(vendors)
            .where(inArray(vendors.id, vendorIds))
        : Promise.resolve([]),
    ]);

    const purposeMap = new Map(purposeRows.map((p) => [p.id, p]));
    const vendorMap = new Map(vendorRows.map((v) => [v.id, v]));

    const metadata =
      record.metadata && typeof record.metadata === "object"
        ? (record.metadata as Record<string, unknown>)
        : {};
    const storedProof = readStoredCryptoProof(metadata);
    const claims = {
      v: 1 as const,
      consentId: record.consentId,
      websiteId: record.websiteId,
      policyVersionId: record.policyVersionId,
      status: record.status,
      choice: typeof metadata.choice === "string" ? metadata.choice : null,
      jurisdiction: record.jurisdiction,
      decisions: decisions.map((d) => ({
        purposeId: d.purposeId,
        vendorId: d.vendorId,
        granted: d.granted,
      })),
      consentedAt:
        typeof metadata.capturedAt === "string"
          ? metadata.capturedAt
          : (record.consentedAt ?? record.createdAt).toISOString(),
    };
    const currentProof = createConsentCryptoProof(claims, record.updatedAt);
    const verification = storedProof
      ? verifyConsentCryptoProof({ claims, proof: storedProof })
      : { hashMatches: false, signatureValid: false, intact: false };

    return NextResponse.json({
      success: true,
      currentStateDeleted: false,
      evidence: {
        consentId: record.consentId,
        visitorId: record.visitorId,
        status: record.status,
        source: record.source,
        jurisdiction: record.jurisdiction,
        consentedAt: record.consentedAt,
        expiresAt: record.expiresAt,
        withdrawnAt: record.withdrawnAt,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        website: website
          ? { id: website.id, name: website.name, domain: website.domain, siteKey: website.siteKey }
          : null,
        policyVersion: policyVersion
          ? {
              id: policyVersion.id,
              version: policyVersion.version,
              policyName,
              isPublished: policyVersion.isPublished,
              publishedAt: policyVersion.publishedAt,
            }
          : null,
        noticeSnapshot: history[0]?.noticeSnapshot ?? record.metadata ?? null,
        decisions: decisions.map((d) => {
          const purpose = d.purposeId ? purposeMap.get(d.purposeId) : null;
          const vendor = d.vendorId ? vendorMap.get(d.vendorId) : null;
          return {
            type: purpose ? "purpose" : "vendor",
            id: d.purposeId ?? d.vendorId,
            key: purpose?.key ?? null,
            name: purpose?.name ?? vendor?.name ?? null,
            domain: vendor?.domain ?? null,
            decision: d.decision,
            granted: d.granted,
            decidedAt: d.decidedAt,
          };
        }),
        events: events.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          eventData: e.eventData,
          source: e.source,
          occurredAt: e.occurredAt,
        })),
        proof: {
          stored: storedProof,
          currentHash: currentProof.hash,
          verification,
        },
        history: history.map(serializeSnapshot),
      },
    });
  } catch (error) {
    console.error("Consent evidence fetch failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch consent evidence" },
      { status: 500 },
    );
  }
}
