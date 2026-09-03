import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import { loadConsentAnalytics } from "@/lib/analytics/queries";

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

    return NextResponse.json({
      success: true,
      analytics: aggregated,
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
