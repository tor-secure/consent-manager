import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { scans } from "@/db/schema/scans";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import { runDriftForScan } from "@/lib/monitoring/process-scan-drift";
import { logger } from "@/lib/logger";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const { isAuthenticated, userId, orgId } = await auth();
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (!orgId) {
      return NextResponse.json({ success: false, message: "No active organization selected" }, { status: 400 });
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
      return NextResponse.json(
        { success: false, message: "You do not belong to this organization." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const websiteId = String((body as { websiteId?: unknown }).websiteId ?? "").trim();
    const scanId = String((body as { scanId?: unknown }).scanId ?? "").trim();

    if (!websiteId || !UUID_RE.test(websiteId)) {
      return NextResponse.json({ success: false, message: "websiteId is required" }, { status: 400 });
    }

    const [website] = await db
      .select({ id: websites.id })
      .from(websites)
      .where(and(eq(websites.id, websiteId), eq(websites.organizationId, organization.id)))
      .limit(1);

    if (!website) {
      return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
    }

    let targetScanId = scanId;
    if (targetScanId) {
      if (!UUID_RE.test(targetScanId)) {
        return NextResponse.json({ success: false, message: "Invalid scanId" }, { status: 400 });
      }
      const [scan] = await db
        .select({ id: scans.id, websiteId: scans.websiteId, status: scans.status })
        .from(scans)
        .innerJoin(websites, eq(scans.websiteId, websites.id))
        .where(
          and(
            eq(scans.id, targetScanId),
            eq(scans.websiteId, website.id),
            eq(websites.organizationId, organization.id),
          ),
        )
        .limit(1);
      if (!scan || scan.status !== "completed") {
        return NextResponse.json({ success: false, message: "Completed scan not found" }, { status: 404 });
      }
    } else {
      const [latest] = await db
        .select({ id: scans.id })
        .from(scans)
        .innerJoin(websites, eq(scans.websiteId, websites.id))
        .where(
          and(
            eq(scans.websiteId, website.id),
            eq(scans.status, "completed"),
            eq(websites.organizationId, organization.id),
          ),
        )
        .orderBy(desc(scans.completedAt))
        .limit(1);
      if (!latest) {
        return NextResponse.json(
          { success: false, message: "No completed scan is available for this website." },
          { status: 400 },
        );
      }
      targetScanId = latest.id;
    }

    await runDriftForScan(targetScanId, website.id);
    return NextResponse.json({ success: true, scanId: targetScanId });
  } catch (error) {
    logger.error("Manual drift check failed", {
      operation: "monitoring.drift.manual",
      error,
    });
    return NextResponse.json({ success: false, message: "Unable to run drift check." }, { status: 500 });
  }
}
