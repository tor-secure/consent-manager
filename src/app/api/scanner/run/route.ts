import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { runScan, websiteHasRunningScan } from "@/lib/scanner/scan-engine";
import { touchScheduleAfterScan } from "@/lib/scanner/run-due-scans";
import {
  assertSafeScanUrl,
  ScannerUrlError,
  toAbsoluteScanUrl,
} from "@/lib/scanner/ssrf-guard";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { resolveLocalOrganization, resolveLocalUser, resolveActiveMembership } from "@/lib/api-auth-helpers";

// POST /api/scanner/run
// Body: { websiteId: string }
// Creates a scan, runs it synchronously, returns the scanId.
// Tenant-safe: website must belong to the active org.
export async function POST(request: Request) {
  try {
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const limit = rateLimit({
      key: `scanner-run:${orgId}:${userId}:${getClientIp(request)}`,
      limit: 10,
      windowMs: 60 * 60_000,
    });
    if (!limit.allowed) return rateLimitResponse(limit);

    const localUser = await resolveLocalUser(userId);

    if (!localUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    const organization = await resolveLocalOrganization(orgId);

    if (!organization) {
      return NextResponse.json(
        { success: false, message: "Organization not found" },
        { status: 404 },
      );
    }

    const membership = await resolveActiveMembership(organization.id, localUser.id);
    if (!membership) {
      return NextResponse.json(
        { success: false, message: "You do not belong to this organization." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const websiteId = String(body.websiteId ?? "").trim();

    if (!websiteId) {
      return NextResponse.json(
        { success: false, message: "websiteId is required" },
        { status: 400 },
      );
    }

    // Verify website belongs to this org.
    const [website] = await db
      .select({ id: websites.id, domain: websites.domain, status: websites.status })
      .from(websites)
      .where(
        and(
          eq(websites.id, websiteId),
          eq(websites.organizationId, organization.id),
        ),
      )
      .limit(1);

    if (!website) {
      return NextResponse.json(
        { success: false, message: "Website not found" },
        { status: 404 },
      );
    }

    if (website.status !== "active") {
      return NextResponse.json(
        { success: false, message: "Website is not active" },
        { status: 400 },
      );
    }

    try {
      await assertSafeScanUrl(toAbsoluteScanUrl(website.domain));
    } catch (error) {
      if (error instanceof ScannerUrlError) {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 400 },
        );
      }
      throw error;
    }

    if (await websiteHasRunningScan(website.id)) {
      return NextResponse.json(
        { success: false, message: "A scan is already running for this website." },
        { status: 409 },
      );
    }

    const result = await runScan(website.id, website.domain, { triggeredBy: "manual" });
    await touchScheduleAfterScan({
      websiteId: website.id,
      scanId: result.scanId,
      status: result.status,
      errorMessage: result.errorMessage,
    });

    return NextResponse.json({ success: true, scanId: result.scanId, status: result.status }, { status: 201 });
  } catch (error) {
    logger.error("Scanner run request failed", {
      operation: "scanner.run.request",
      error,
    });
    return NextResponse.json(
      { success: false, message: "Failed to run scan" },
      { status: 500 },
    );
  }
}
