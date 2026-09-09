import { NextResponse } from "next/server";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { trackers } from "@/db/schema/trackers";
import { websites } from "@/db/schema/websites";
import { scanResults } from "@/db/schema/scan-results";
import { logger } from "@/lib/logger";
import { authorizeTrackerOrganization } from "@/lib/trackers/http";
import { detectionMatchStatus, isUnmappedForReview } from "@/lib/trackers/management";

export async function GET(request: Request) {
  try {
    const authz = await authorizeTrackerOrganization();
    if ("error" in authz) return authz.error;

    const websiteId = new URL(request.url).searchParams.get("websiteId");
    const orgWebsites = await db
      .select({ id: websites.id, name: websites.name, domain: websites.domain })
      .from(websites)
      .where(eq(websites.organizationId, authz.organization.id));
    const websiteIds = orgWebsites
      .map((site) => site.id)
      .filter((id) => !websiteId || id === websiteId);
    if (websiteId && !websiteIds.includes(websiteId)) {
      return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
    }
    if (websiteIds.length === 0) {
      return NextResponse.json({ success: true, unmapped: [] });
    }

    const trackerRows = await db
      .select({
        tracker: trackers,
        websiteName: websites.name,
        websiteDomain: websites.domain,
      })
      .from(trackers)
      .innerJoin(websites, eq(trackers.websiteId, websites.id))
      .where(
        and(
          eq(websites.organizationId, authz.organization.id),
          inArray(trackers.websiteId, websiteIds),
        ),
      )
      .orderBy(desc(trackers.lastSeenAt), desc(trackers.updatedAt));

    const scanRows = websiteIds.length
      ? await db
        .select({
          domain: scanResults.domain,
          identifier: scanResults.identifier,
          type: scanResults.type,
          pageUrl: scanResults.pageUrl,
          websiteId: scanResults.websiteId,
          firstDetected: sql<Date>`min(${scanResults.detectedAt})`,
          lastDetected: sql<Date>`max(${scanResults.detectedAt})`,
          detectionCount: sql<number>`count(*)::int`,
        })
        .from(scanResults)
        .innerJoin(websites, eq(scanResults.websiteId, websites.id))
        .where(
          and(
            eq(websites.organizationId, authz.organization.id),
            inArray(scanResults.websiteId, websiteIds),
            or(isNull(scanResults.vendorId), isNull(scanResults.purposeId)),
          ),
        )
        .groupBy(
          scanResults.domain,
          scanResults.identifier,
          scanResults.type,
          scanResults.pageUrl,
          scanResults.websiteId,
        )
      : [];

    const unmapped = trackerRows
      .filter((row) => isUnmappedForReview({
        purposeId: row.tracker.purposeId,
        vendorId: row.tracker.vendorId,
        isEssential: row.tracker.isEssential,
        status: row.tracker.status,
        scannerClassification: row.tracker.scannerClassification,
      }))
      .map((row) => {
        const match = detectionMatchStatus({
          matchedTracker: {
            name: row.tracker.name,
            purposeId: row.tracker.purposeId,
            vendorId: row.tracker.vendorId,
          },
        });
        const related = scanRows.filter((scan) =>
          scan.websiteId === row.tracker.websiteId &&
          (
            scan.identifier === row.tracker.identifier ||
            (scan.domain && scan.domain === row.tracker.domain)
          ),
        );
        return {
          id: row.tracker.id,
          name: row.tracker.name,
          type: row.tracker.type,
          domain: row.tracker.domain,
          identifier: row.tracker.identifier,
          websiteId: row.tracker.websiteId,
          websiteName: row.websiteName,
          websiteDomain: row.websiteDomain,
          status: match.status,
          recommendedAction: match.recommendedAction,
          firstDetected: row.tracker.firstSeenAt,
          lastDetected: row.tracker.lastSeenAt,
          detectionCount: related.reduce((sum, item) => sum + Number(item.detectionCount || 0), 0) || 1,
          pages: [...new Set(related.map((item) => item.pageUrl).filter(Boolean))],
        };
      });

    return NextResponse.json({ success: true, unmapped });
  } catch (error) {
    logger.error("Unmapped tracker list failed", { route: "GET /api/trackers/unmapped", error });
    return NextResponse.json({ success: false, message: "Unable to load unmapped trackers." }, { status: 500 });
  }
}
