import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import { loadConsentAnalytics } from "@/lib/analytics/queries";
import { purposes } from "@/db/schema/purposes";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { isValidConsentId } from "@/lib/sdk/public-http";
import { evaluateConsentForTenant, logConsentEvaluation } from "@/lib/consent-evaluation";
import { randomUUID } from "node:crypto";

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

      const consentWebsiteId = url.searchParams.get("websiteId")?.trim() ?? "";
      if (!consentWebsiteId) {
        return NextResponse.json(
          { success: false, message: "websiteId is required when redacting analytics" },
          { status: 400 },
        );
      }
      const purposeIds = analytics.purposes.map((item) => item.purposeId).filter((id): id is string => typeof id === "string");
      const purposeRows = purposeIds.length ? await db.select({ id: purposes.id, key: purposes.key })
        .from(purposes).where(and(
          eq(purposes.organizationId, organization.id),
          inArray(purposes.id, purposeIds),
          isNull(purposes.deletedAt),
        )) : [];
      const evaluation = await evaluateConsentForTenant(
        { organizationId: organization.id, websiteId: consentWebsiteId, consentId: redactConsentId },
        { purposeKeys: purposeRows.map((item) => item.key), vendorDomains: [], trackerIds: [], dataCategories: [] },
      );

      if (evaluation) {
        const keyToId = new Map(purposeRows.map((item) => [item.key.toLowerCase(), item.id]));
        const allowedPurposeIds = new Set(evaluation.result.results.purposes
          .filter((item) => item.allowed)
          .map((item) => keyToId.get(item.requested.toLowerCase()))
          .filter((id): id is string => Boolean(id)));
        await logConsentEvaluation({
          organizationId: organization.id,
          userId: localUser.id,
          requestId: randomUUID(),
          source: "dashboard",
          evaluation,
          request: { purposeKeys: purposeRows.map((item) => item.key), vendorDomains: [], trackerIds: [], dataCategories: [] },
        });

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
