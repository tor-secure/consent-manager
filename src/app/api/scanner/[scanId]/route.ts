import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { scans } from "@/db/schema/scans";
import { scanResults } from "@/db/schema/scan-results";

// GET /api/scanner/[scanId]
// Returns the scan status + result summary. Tenant-safe.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ scanId: string }> },
) {
  try {
    const { scanId } = await params;
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const [organization] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.clerkOrganizationId, orgId))
      .limit(1);

    if (!organization) {
      return NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 });
    }

    // Scope scan through org websites.
    const orgWebsites = await db
      .select({ id: websites.id })
      .from(websites)
      .where(eq(websites.organizationId, organization.id));

    const websiteIds = orgWebsites.map((w) => w.id);
    if (websiteIds.length === 0) {
      return NextResponse.json({ success: false, message: "Scan not found" }, { status: 404 });
    }

    const [scan] = await db
      .select()
      .from(scans)
      .where(
        and(
          eq(scans.id, scanId),
          inArray(scans.websiteId, websiteIds),
        ),
      )
      .limit(1);

    if (!scan) {
      return NextResponse.json({ success: false, message: "Scan not found" }, { status: 404 });
    }

    // Fetch results for this scan.
    const results = await db
      .select({
        id: scanResults.id,
        type: scanResults.type,
        name: scanResults.name,
        domain: scanResults.domain,
        identifier: scanResults.identifier,
        classificationStatus: scanResults.classificationStatus,
        riskLevel: scanResults.riskLevel,
        details: scanResults.details,
        detectedAt: scanResults.detectedAt,
      })
      .from(scanResults)
      .where(eq(scanResults.scanId, scan.id))
      .orderBy(scanResults.riskLevel, scanResults.name);

    return NextResponse.json({
      success: true,
      scan: {
        id: scan.id,
        websiteId: scan.websiteId,
        status: scan.status,
        scanType: scan.scanType,
        pagesScanned: scan.pagesScanned,
        itemsDetected: scan.itemsDetected,
        errorMessage: scan.errorMessage,
        startedAt: scan.startedAt,
        completedAt: scan.completedAt,
        createdAt: scan.createdAt,
      },
      results,
    });
  } catch (error) {
    console.error("Scan fetch failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch scan" },
      { status: 500 },
    );
  }
}
