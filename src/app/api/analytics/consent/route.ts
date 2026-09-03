import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import { loadConsentAnalytics } from "@/lib/analytics/queries";
import { consentRecords } from "@/db/schema/consent-records";
import { consentDecisions } from "@/db/schema/consent-decisions";
import { purposes } from "@/db/schema/purposes";
import { and, eq } from "drizzle-orm";
import { isValidConsentId } from "@/lib/sdk/public-http";

export async function GET(request: Request) {
  try {
    const { isAuthenticated, userId, orgId } = await auth();
    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const limit = rateLimit({
      key: `analytics-consent:${orgId}:${userId}:${getClientIp(request)}`,
      limit: 60,
      windowMs: 60_000,
    });
    if (!limit.allowed) return rateLimitResponse(limit);

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
      return NextResponse.json(
        { success: false, message: "You do not belong to this organization." },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const redactConsentId = url.searchParams.get("redactConsentId")?.trim() ?? null;

    const data = await loadConsentAnalytics(organization.id, {
      websiteId: url.searchParams.get("websiteId"),
      days: url.searchParams.get("days"),
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      country: url.searchParams.get("country"),
      device: url.searchParams.get("device"),
      browser: url.searchParams.get("browser"),
      purposeId: url.searchParams.get("purposeId"),
      policyVersionId: url.searchParams.get("policyVersionId"),
    });

    const { websites: _websites, ...aggregated } = data;
    void _websites;

    type AnalyticsPayload = typeof aggregated & {
      redacted?: boolean;
      redactionScope?: { consentId: string; notFound?: boolean };
    };

    let analytics: AnalyticsPayload = aggregated;

    // Real-time consent-based redaction (MVP):
    // when a consentId is provided, only expose purposes that were granted
    // (or are required by the purpose's essential flag).
    if (redactConsentId) {
      if (!isValidConsentId(redactConsentId)) {
        return NextResponse.json(
          { success: false, message: "Invalid redactConsentId format" },
          { status: 400 },
        );
      }

      const consentWebsiteId = url.searchParams.get("websiteId")?.trim() ?? null;
      const consentRecord = await db
        .select({ id: consentRecords.id })
        .from(consentRecords)
        .where(
          and(
            eq(consentRecords.organizationId, organization.id),
            eq(consentRecords.consentId, redactConsentId),
            consentWebsiteId ? eq(consentRecords.websiteId, consentWebsiteId) : undefined,
          ),
        )
        .limit(1);

      if (consentRecord.length) {
        const consentRecordId = consentRecord[0].id;

        const purposeDecisionRows = await db
          .select({
            purposeId: consentDecisions.purposeId,
            granted: consentDecisions.granted,
            isRequired: purposes.isRequired,
          })
          .from(consentDecisions)
          .innerJoin(purposes, eq(consentDecisions.purposeId, purposes.id))
          .where(eq(consentDecisions.consentRecordId, consentRecordId));

        const allowedPurposeIds = new Set(
          purposeDecisionRows
            .filter((r): r is typeof r & { purposeId: string } =>
              Boolean(r.purposeId) && (r.granted || r.isRequired),
            )
            .map((r) => r.purposeId),
        );

        analytics = {
          ...analytics,
          purposes: analytics.purposes.filter(
            (p) => typeof p.purposeId === "string" && allowedPurposeIds.has(p.purposeId),
          ),
          filterOptions: {
            ...analytics.filterOptions,
            purposes: analytics.filterOptions.purposes.filter(
              (p) => typeof p.id === "string" && allowedPurposeIds.has(p.id),
            ),
          },
          redacted: true,
          redactionScope: { consentId: redactConsentId },
        };
      } else {
        analytics = {
          ...analytics,
          purposes: [],
          filterOptions: {
            ...analytics.filterOptions,
            purposes: [],
          },
          redacted: true,
          redactionScope: { consentId: redactConsentId, notFound: true },
        };
      }
    }

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error) {
    logger.error("Consent analytics request failed", {
      operation: "analytics.consent.get",
      error,
    });
    return NextResponse.json(
      { success: false, message: "Failed to load analytics" },
      { status: 500 },
    );
  }
}
