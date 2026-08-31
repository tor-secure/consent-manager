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
  isConsentExpired,
  type ConsentSubmission,
} from "@/lib/consent-engine";
import {
  isValidConsentId,
  isValidWebsiteId,
  MAX_DECISION_ITEMS,
  publicCorsHeaders,
  publicOptionsResponse,
  readPublicJsonObject,
} from "@/lib/sdk/public-http";

const CORS_HEADERS = publicCorsHeaders("GET, POST, OPTIONS");

// ---------------------------------------------------------------------------
// GET /api/consent/record?consentId=<cid>&websiteId=<id>
// Retrieve an existing consent record + decisions.
// Public — called by the browser SDK from external websites.
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const consentId = searchParams.get("consentId")?.trim() ?? "";
    const websiteId = searchParams.get("websiteId")?.trim() ?? "";

    if (!consentId || !websiteId) {
      return NextResponse.json(
        { success: false, message: "consentId and websiteId are required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    if (!isValidConsentId(consentId) || !isValidWebsiteId(websiteId)) {
      return NextResponse.json(
        { success: false, message: "Invalid parameter format" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const [record] = await db
      .select({
        id: consentRecords.id,
        consentId: consentRecords.consentId,
        status: consentRecords.status,
        consentedAt: consentRecords.consentedAt,
        expiresAt: consentRecords.expiresAt,
        withdrawnAt: consentRecords.withdrawnAt,
        policyVersionId: consentRecords.policyVersionId,
      })
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

    // ── Expiry check ────────────────────────────────────────────────────
    // If the consent has expired, return expired=true / requiresReconsent=true
    // so the SDK re-shows the banner. We do NOT mutate the DB on GET.
    const expired = isConsentExpired(record);

    const decisions = expired
      ? []
      : await db
          .select({
            purposeId: consentDecisions.purposeId,
            vendorId: consentDecisions.vendorId,
            granted: consentDecisions.granted,
            decision: consentDecisions.decision,
            decidedAt: consentDecisions.decidedAt,
          })
          .from(consentDecisions)
          .where(eq(consentDecisions.consentRecordId, record.id));

    return NextResponse.json(
      {
        success: true,
        expired,
        requiresReconsent: expired,
        record: {
          id: record.id,
          consentId: record.consentId,
          status: expired ? "expired" : record.status,
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
// Public — called from external websites via the browser SDK.
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const parsed = await readPublicJsonObject(request);
    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, message: parsed.message },
        { status: parsed.status, headers: CORS_HEADERS },
      );
    }
    const body = parsed.body;

    const websiteId = String(body.websiteId ?? "").trim();
    if (!websiteId) {
      return NextResponse.json(
        { success: false, message: "websiteId is required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }
    if (!isValidWebsiteId(websiteId)) {
      return NextResponse.json(
        { success: false, message: "Invalid websiteId" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const rawConsentId = body.consentId;
    const isNew =
      rawConsentId === undefined ||
      rawConsentId === null ||
      String(rawConsentId).trim() === "";
    if (!isNew && !isValidConsentId(String(rawConsentId).trim())) {
      return NextResponse.json(
        { success: false, message: "Invalid consentId" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const submissionRaw = body.submission;
    if (
      !submissionRaw ||
      typeof submissionRaw !== "object" ||
      Array.isArray(submissionRaw)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "submission.choice must be accept-all, reject-all, or granular",
        },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const submissionObj = submissionRaw as Record<string, unknown>;
    if (
      !submissionObj.choice ||
      !["accept-all", "reject-all", "granular"].includes(String(submissionObj.choice))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "submission.choice must be accept-all, reject-all, or granular",
        },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const submission: ConsentSubmission = {
      choice: submissionObj.choice as ConsentSubmission["choice"],
      purposeDecisions: Array.isArray(submissionObj.purposeDecisions)
        ? (submissionObj.purposeDecisions as ConsentSubmission["purposeDecisions"])?.slice(
            0,
            MAX_DECISION_ITEMS,
          )
        : undefined,
      vendorDecisions: Array.isArray(submissionObj.vendorDecisions)
        ? (submissionObj.vendorDecisions as ConsentSubmission["vendorDecisions"])?.slice(
            0,
            MAX_DECISION_ITEMS,
          )
        : undefined,
    };

    // Verify website exists and is active.
    const [website] = await db
      .select({
        id: websites.id,
        organizationId: websites.organizationId,
        status: websites.status,
      })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);

    if (!website || website.status !== "active") {
      return NextResponse.json(
        { success: false, message: "Website not found" },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    // Find the active default policy.
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
      .select({
        id: consentPolicyVersions.id,
        version: consentPolicyVersions.version,
        isPublished: consentPolicyVersions.isPublished,
        configuration: consentPolicyVersions.configuration,
      })
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

    // Load purposes and vendors attached to this version.
    const versionPurposes = await db
      .select({
        id: purposes.id,
        key: purposes.key,
        name: purposes.name,
        isRequired: purposes.isRequired,
      })
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

    const decisionRows = buildDecisionRows(
      submission,
      purposeIds,
      vendorIds,
      requiredPurposeIds,
    );

    const overallStatus = deriveOverallStatus(decisionRows);
    const now = new Date();
    const expiresAt = computeExpiry(bannerConfig.consentExpireDays);

    // ── Consent evidence snapshot ────────────────────────────────────────
    const purposeKeys  = versionPurposes.map((p) => p.key).sort();
    const purposeNames = versionPurposes.map((p) => p.name).sort();

    const evidenceMetadata: Record<string, unknown> = {
      policyVersionId:     latestVersion.id,
      policyVersionNumber: latestVersion.version,
      noticeTitle:         bannerConfig.title,
      noticeDescription:   bannerConfig.description,
      noticeLanguage:      bannerConfig.language || "en",
      bannerLayout:        bannerConfig.layout,
      bannerPosition:      bannerConfig.position,
      purposeCount:        versionPurposes.length,
      vendorCount:         vendorIds.length,
      purposeKeys,
      purposeNames,
      consentExpireDays:   bannerConfig.consentExpireDays,
      defaultConsent:      bannerConfig.defaultConsent,
      capturedAt:          now.toISOString(),
    };

    // ── Transaction: save record + decisions ─────────────────────────────
    let wasExpiredRecord = false;

    // Initialise with a placeholder — guaranteed to be replaced inside the
    // transaction; the type-assertion below is safe because the transaction
    // throws on any DB error and we never reach the code after it.
    let savedRecord: typeof consentRecords.$inferSelect =
      null as unknown as typeof consentRecords.$inferSelect;

    await db.transaction(async (tx) => {
      if (isNew) {
        const consentId = generateConsentId();
        const [inserted] = await tx
          .insert(consentRecords)
          .values({
            organizationId: website.organizationId,
            websiteId: website.id,
            policyVersionId: latestVersion.id,
            consentId,
            visitorId: body.visitorId
              ? String(body.visitorId).trim().slice(0, 255)
              : null,
            jurisdiction: body.jurisdiction
              ? String(body.jurisdiction).trim().slice(0, 100)
              : bannerConfig.region || null,
            status: overallStatus,
            source: "web",
            consentedAt: now,
            expiresAt,
            metadata: evidenceMetadata,
          })
          .returning();
        savedRecord = inserted;
      } else {
        // Update — verify the record belongs to this website.
        const [existing] = await tx
          .select()
          .from(consentRecords)
          .where(
            and(
              eq(consentRecords.consentId, String(rawConsentId).trim()),
              eq(consentRecords.websiteId, website.id),
            ),
          )
          .limit(1);

        if (!existing) {
          throw new Error("Consent record not found");
        }
        if (existing.status === "withdrawn") {
          throw new Error("Consent record already withdrawn");
        }

        wasExpiredRecord = isConsentExpired(existing);

        const [updated] = await tx
          .update(consentRecords)
          .set({
            status: overallStatus,
            policyVersionId: latestVersion.id,
            consentedAt: now,
            expiresAt,
            metadata: evidenceMetadata,
            updatedAt: now,
          })
          .where(
            and(
              eq(consentRecords.consentId, String(rawConsentId).trim()),
              eq(consentRecords.websiteId, website.id),
            ),
          )
          .returning();
        savedRecord = updated;

        await tx
          .delete(consentDecisions)
          .where(eq(consentDecisions.consentRecordId, savedRecord.id));
      }

      if (decisionRows.length > 0) {
        await tx.insert(consentDecisions).values(
          decisionRows.map((d) => ({
            consentRecordId: savedRecord.id,
            purposeId: d.purposeId,
            vendorId: d.vendorId,
            decision: d.decision,
            granted: d.granted,
            decidedAt: d.decidedAt,
          })),
        );
      }
    });

    // ── Append consent event (best-effort — must not fail the response) ──
    // The consent record is already committed at this point. An event-append
    // failure is logged but never surfaces as a 500 to the visitor.
    const eventType = isNew
      ? "consent.created"
      : wasExpiredRecord
        ? "consent.expired_and_renewed"
        : "consent.updated";

    try {
      await appendConsentEvent({
        consentRecordId: savedRecord.id,
        policyVersionId: latestVersion.id,
        eventType,
        eventData: {
          choice: submission.choice,
          status: overallStatus,
          decisionCount: decisionRows.length,
          policyVersionNumber: latestVersion.version,
          purposeKeys,
          ...(wasExpiredRecord ? { previouslyExpired: true } : {}),
        },
      });
    } catch (eventError) {
      // Non-fatal — the consent is saved; only the event log entry is missing.
      console.error("appendConsentEvent failed (non-fatal):", eventError);
    }

    return NextResponse.json(
      {
        success: true,
        consentId: savedRecord.consentId,
        status: overallStatus,
        policyVersionId: latestVersion.id,
        expiresAt: savedRecord.expiresAt,
      },
      { status: isNew ? 201 : 200, headers: CORS_HEADERS },
    );
  } catch (error) {
    // Distinguish user-facing validation errors from internal failures.
    const msg =
      error instanceof Error &&
      (error.message === "Consent record not found" ||
        error.message === "Consent record already withdrawn")
        ? error.message
        : "Failed to submit consent";

    const status =
      error instanceof Error && error.message === "Consent record not found"
        ? 404
        : error instanceof Error &&
            error.message === "Consent record already withdrawn"
          ? 409
          : 500;

    if (status === 500) {
      console.error("Consent record submission failed:", error);
    }

    return NextResponse.json(
      { success: false, message: msg },
      { status, headers: CORS_HEADERS },
    );
  }
}

// CORS preflight.
export async function OPTIONS() {
  return publicOptionsResponse("GET, POST, OPTIONS");
}
