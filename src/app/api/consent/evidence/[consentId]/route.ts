import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { consentRecords } from "@/db/schema/consent-records";
import { consentDecisions } from "@/db/schema/consent-decisions";
import { consentEvents } from "@/db/schema/consent-events";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { consentPolicies } from "@/db/schema/consent-policies";
import { purposes } from "@/db/schema/purposes";
import { vendors } from "@/db/schema/vendors";
import {
  createConsentCryptoProof,
  readStoredCryptoProof,
  verifyConsentCryptoProof,
} from "@/lib/consent-proof";

// ---------------------------------------------------------------------------
// GET /api/consent/evidence/[consentId]
//
// Returns the full consent evidence bundle for one consent record.
// Accessible only to authenticated members of the organization that owns the
// website the consent was collected for.
//
// The response includes:
//  - consent record metadata (status, timestamps, policy version, jurisdiction)
//  - per-purpose and per-vendor decisions with human-readable names/keys
//  - all consent events (audit trail) with event data
//  - the notice snapshot stored in metadata at consent time
//
// PII minimisation: visitorId is included (it is a system-generated opaque ID,
// not a name or email) but is kept to the level already stored. No additional
// PII is exposed beyond what the record already contains.
// ---------------------------------------------------------------------------

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

    // ── Resolve local org and verify membership ──────────────────────────
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

    // ── Load the consent record scoped to this org ───────────────────────
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

    if (!record) {
      return NextResponse.json({ success: false, message: "Consent record not found" }, { status: 404 });
    }

    // ── Load website info ────────────────────────────────────────────────
    const [website] = await db
      .select({ id: websites.id, name: websites.name, domain: websites.domain, siteKey: websites.siteKey })
      .from(websites)
      .where(eq(websites.id, record.websiteId))
      .limit(1);

    // ── Load policy version ──────────────────────────────────────────────
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

    // ── Load decisions with resolved names ───────────────────────────────
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

    // Bulk-resolve purpose and vendor names for human-readable evidence.
    const purposeIds = [...new Set(decisions.map((d) => d.purposeId).filter(Boolean) as string[])];
    const vendorIds  = [...new Set(decisions.map((d) => d.vendorId).filter(Boolean)  as string[])];

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
    const vendorMap  = new Map(vendorRows.map((v) => [v.id, v]));

    // ── Load consent events (immutable audit trail) ───────────────────────
    const events = await db
      .select({
        id: consentEvents.id,
        eventType: consentEvents.eventType,
        eventData: consentEvents.eventData,
        source: consentEvents.source,
        occurredAt: consentEvents.occurredAt,
      })
      .from(consentEvents)
      .where(eq(consentEvents.consentRecordId, record.id))
      .orderBy(consentEvents.occurredAt);

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

    // ── Assemble the evidence bundle ──────────────────────────────────────
    return NextResponse.json({
      success: true,
      evidence: {
        // ── Record identity ────────────────────────────────────────────
        consentId: record.consentId,
        visitorId: record.visitorId,
        status:    record.status,
        source:    record.source,
        jurisdiction: record.jurisdiction,

        // ── Timestamps ───────────────────────────────────────────────
        consentedAt: record.consentedAt,
        expiresAt:   record.expiresAt,
        withdrawnAt: record.withdrawnAt,
        createdAt:   record.createdAt,
        updatedAt:   record.updatedAt,

        // ── Website context ───────────────────────────────────────────
        website: website
          ? { id: website.id, name: website.name, domain: website.domain, siteKey: website.siteKey }
          : null,

        // ── Policy/notice version ─────────────────────────────────────
        policyVersion: policyVersion
          ? {
              id:          policyVersion.id,
              version:     policyVersion.version,
              policyName:  policyName,
              isPublished: policyVersion.isPublished,
              publishedAt: policyVersion.publishedAt,
            }
          : null,

        // ── Notice snapshot (what was presented at consent time) ───────
        // Stored in metadata at insert time — preserves the exact notice
        // text and configuration shown to the visitor.
        noticeSnapshot: record.metadata ?? null,

        // ── Per-purpose and per-vendor decisions ──────────────────────
        decisions: decisions.map((d) => {
          const purpose = d.purposeId ? purposeMap.get(d.purposeId) : null;
          const vendor  = d.vendorId  ? vendorMap.get(d.vendorId)   : null;
          return {
            type:      purpose ? "purpose" : "vendor",
            id:        d.purposeId ?? d.vendorId,
            key:       purpose?.key  ?? null,
            name:      purpose?.name ?? vendor?.name ?? null,
            domain:    vendor?.domain ?? null,
            decision:  d.decision,
            granted:   d.granted,
            decidedAt: d.decidedAt,
          };
        }),

        // ── Immutable event audit trail ───────────────────────────────
        events: events.map((e) => ({
          id:         e.id,
          eventType:  e.eventType,
          eventData:  e.eventData,
          source:     e.source,
          occurredAt: e.occurredAt,
        })),

        proof: {
          stored: storedProof,
          currentHash: currentProof.hash,
          verification,
        },
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
