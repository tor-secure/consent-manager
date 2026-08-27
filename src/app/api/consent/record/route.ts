import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { consentRecords } from "@/db/schema/consent-records";
import { consentDecisions } from "@/db/schema/consent-decisions";
import { policyPurposes } from "@/db/schema/policy-purposes";
import { purposes } from "@/db/schema/purposes";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import { parseBannerConfig } from "@/lib/banner-config";
import {
  generateConsentId,
  computeExpiry,
  buildDecisionRows,
  appendConsentEvent,
  deriveOverallStatus,
  type ConsentSubmission,
} from "@/lib/consent-engine";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

// ---------------------------------------------------------------------------
// GET /api/consent/record?consentId=<cid>&websiteId=<id>
// Retrieve an existing consent record + decisions.
// Public — called by the browser SDK from external websites.
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const consentId = searchParams.get("consentId")?.trim();
    const websiteId = searchParams.get("websiteId")?.trim();

    if (!consentId || !websiteId) {
      return NextResponse.json(
        { success: false, message: "consentId and websiteId are required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const [record] = await db
      .select()
      .from(consentRecords)
      .where(
        and(
          eq(consentRecords.consentId, consentId),
          eq(consentRecords.websiteId, websiteId),
        ),
      )
      .limit(1);

    if (!record) {
      return NextResponse.json(
        { success: false, message: "Consent record not found" },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    const decisions = await db
      .select()
      .from(consentDecisions)
      .where(eq(consentDecisions.consentRecordId, record.id));

    return NextResponse.json(
      {
        success: true,
        record: {
          id: record.id,
          consentId: record.consentId,
          status: record.status,
          consentedAt: record.consentedAt,
          expiresAt: record.expiresAt,
          withdrawnAt: record.withdrawnAt,
          policyVersionId: record.policyVersionId,
        },
        decisions: decisions.map((d) => ({
          purposeId: d.purposeId,
          vendorId: d.vendorId,
          granted: d.granted,
          decision: d.decision,
          decidedAt: d.decidedAt,
        })),
      },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error("Consent record fetch failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch consent record" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/consent/record
// Create or update a consent record.
// Body: {
//   websiteId: string,
//   consentId?: string,        // if omitted, a new record is created
//   visitorId?: string,
//   jurisdiction?: string,
//   submission: ConsentSubmission,
// }
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const websiteId = String(body.websiteId ?? "").trim();
    if (!websiteId) {
      return NextResponse.json(
        { success: false, message: "websiteId is required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const submission = body.submission as ConsentSubmission;
    if (!submission?.choice || !["accept-all", "reject-all", "granular"].includes(submission.choice)) {
      return NextResponse.json(
        { success: false, message: "submission.choice must be accept-all, reject-all, or granular" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // Verify website exists and is active.
    const [website] = await db
      .select({ id: websites.id, organizationId: websites.organizationId, status: websites.status })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);

    if (!website || website.status !== "active") {
      return NextResponse.json(
        { success: false, message: "Website not found" },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    // Find the active default policy for this website.
    const [policy] = await db
      .select({ id: consentPolicies.id })
      .from(consentPolicies)
      .where(
        and(
          eq(consentPolicies.websiteId, website.id),
          eq(consentPolicies.status, "active"),
        ),
      )
      .orderBy(consentPolicies.isDefault)
      .limit(1);

    if (!policy) {
      return NextResponse.json(
        { success: false, message: "No active policy found for this website" },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    // Get the latest published version (or latest draft).
    const allVersions = await db
      .select()
      .from(consentPolicyVersions)
      .where(eq(consentPolicyVersions.policyId, policy.id))
      .orderBy(consentPolicyVersions.version);

    const latestVersion =
      allVersions.findLast((v) => v.isPublished) ??
      allVersions[allVersions.length - 1] ??
      null;

    if (!latestVersion) {
      return NextResponse.json(
        { success: false, message: "No policy version found" },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    const bannerConfig = parseBannerConfig(
      latestVersion.configuration as Record<string, unknown>,
    );

    // Load all purposes and vendors attached to this version.
    const versionPurposes = await db
      .select({ id: purposes.id, isRequired: purposes.isRequired })
      .from(policyPurposes)
      .innerJoin(purposes, eq(policyPurposes.purposeId, purposes.id))
      .where(eq(policyPurposes.policyVersionId, latestVersion.id));

    const purposeIds = versionPurposes.map((p) => p.id);
    const requiredPurposeIds = new Set(
      versionPurposes.filter((p) => p.isRequired).map((p) => p.id),
    );

    const vpLinks =
      purposeIds.length > 0
        ? await db
            .select({ vendorId: vendorPurposes.vendorId })
            .from(vendorPurposes)
            .where(inArray(vendorPurposes.purposeId, purposeIds))
        : [];

    const vendorIds = [...new Set(vpLinks.map((v) => v.vendorId))];

    // Build decision rows.
    const decisionRows = buildDecisionRows(
      submission,
      purposeIds,
      vendorIds,
      requiredPurposeIds,
    );

    const overallStatus = deriveOverallStatus(decisionRows);
    const now = new Date();
    const expiresAt = computeExpiry(bannerConfig.consentExpireDays);

    let consentRecord: typeof consentRecords.$inferSelect;
    const isNew = !body.consentId;

    await db.transaction(async (tx) => {
      if (isNew) {
        // Create a new consent record.
        const consentId = generateConsentId();

        [consentRecord] = await tx
          .insert(consentRecords)
          .values({
            organizationId: website.organizationId,
            websiteId: website.id,
            policyVersionId: latestVersion.id,
            consentId,
            visitorId: body.visitorId ? String(body.visitorId).trim() : null,
            jurisdiction: body.jurisdiction ? String(body.jurisdiction).trim() : bannerConfig.region || null,
            status: overallStatus,
            source: "web",
            consentedAt: now,
            expiresAt,
            metadata: {},
          })
          .returning();
      } else {
        // Update existing record — verify it belongs to this website.
        const existing = await tx
          .select()
          .from(consentRecords)
          .where(
            and(
              eq(consentRecords.consentId, String(body.consentId)),
              eq(consentRecords.websiteId, website.id),
            ),
          )
          .limit(1);

        if (!existing[0] || existing[0].status === "withdrawn") {
          throw new Error("Consent record not found or already withdrawn");
        }

        [consentRecord] = await tx
          .update(consentRecords)
          .set({
            status: overallStatus,
            policyVersionId: latestVersion.id,
            consentedAt: now,
            expiresAt,
            updatedAt: now,
          })
          .where(
            and(
              eq(consentRecords.consentId, String(body.consentId)),
              eq(consentRecords.websiteId, website.id),
            ),
          )
          .returning()
          .then((r) => r);

        consentRecord = consentRecord!;

        // Delete all previous decisions before re-inserting.
        await tx
          .delete(consentDecisions)
          .where(eq(consentDecisions.consentRecordId, consentRecord.id));
      }

      // Insert decisions.
      if (decisionRows.length > 0) {
        await tx.insert(consentDecisions).values(
          decisionRows.map((d) => ({
            consentRecordId: consentRecord.id,
            purposeId: d.purposeId,
            vendorId: d.vendorId,
            decision: d.decision,
            granted: d.granted,
            decidedAt: d.decidedAt,
          })),
        );
      }
    });

    // Append consent event outside transaction (best-effort, non-blocking).
    await appendConsentEvent({
      consentRecordId: consentRecord!.id,
      policyVersionId: latestVersion.id,
      eventType: isNew ? "consent.created" : "consent.updated",
      eventData: {
        choice: submission.choice,
        status: overallStatus,
        decisionCount: decisionRows.length,
      },
    });

    return NextResponse.json(
      {
        success: true,
        consentId: consentRecord!.consentId,
        status: overallStatus,
        policyVersionId: latestVersion.id,
        expiresAt: consentRecord!.expiresAt,
      },
      { status: isNew ? 201 : 200, headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error("Consent record submission failed:", error);
    // Never return raw error messages to callers — they may contain DB details.
    return NextResponse.json(
      { success: false, message: "Failed to submit consent" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

// CORS preflight — consent submission is cross-origin from external websites.
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
