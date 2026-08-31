import "server-only";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { scans } from "@/db/schema/scans";
import { scanResults } from "@/db/schema/scan-results";
import { trackers } from "@/db/schema/trackers";
import { logger } from "@/lib/logger";
import { analyseUrl } from "./html-analyser";
import { toAbsoluteScanUrl, ScannerUrlError } from "./ssrf-guard";

const SCANNER_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// runScan
//
// Creates a scan record, fetches + analyses the URL, persists results, and
// upserts tracker records. Runs synchronously in the request (no background
// queue yet — for large sites a queue would be needed).
// ---------------------------------------------------------------------------

export async function runScan(websiteId: string, websiteUrl: string): Promise<string> {
  // Create the scan record in "running" state.
  const [scan] = await db
    .insert(scans)
    .values({
      websiteId,
      status: "running",
      scanType: "quick",
      scannerVersion: SCANNER_VERSION,
      startedAt: new Date(),
    })
    .returning();

  try {
    const targetUrl = toAbsoluteScanUrl(websiteUrl);
    const result = await analyseUrl(targetUrl);

    if (result.fetchError) {
      // Mark scan as failed.
      await db
        .update(scans)
        .set({
          status: "failed",
          errorMessage: result.fetchError,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(scans.id, scan.id));

      return scan.id;
    }

    const now = new Date();

    // Persist each detected item as a scan_result.
    if (result.items.length > 0) {
      await db.insert(scanResults).values(
        result.items.map((item) => ({
          scanId: scan.id,
          websiteId,
          type: item.type,
          name: item.name,
          domain: item.domain,
          identifier: item.identifier,
          classificationStatus: item.classificationStatus,
          riskLevel: item.riskLevel,
          details: {
            ...item.details,
            category: item.category,
          } as Record<string, unknown>,
          detectedAt: now,
        })),
      );

      // Upsert trackers — create or update records for each detected item.
      // We use the identifier (or domain) as the dedup key per website.
      for (const item of result.items) {
        const dedupKey = item.identifier ?? item.domain ?? item.name;
        if (!dedupKey) continue;

        // Check if a tracker with this identifier already exists for the website.
        const [existing] = await db
          .select({ id: trackers.id, lastSeenAt: trackers.lastSeenAt })
          .from(trackers)
          .where(
            and(
              eq(trackers.websiteId, websiteId),
              eq(trackers.identifier, dedupKey),
            ),
          )
          .limit(1);

        if (existing) {
          // Update lastSeenAt and detectionMethod.
          await db
            .update(trackers)
            .set({
              lastSeenAt: now,
              detectionMethod: "scan",
              updatedAt: now,
              // Update domain if it's been resolved.
              ...(item.domain ? { domain: item.domain } : {}),
            })
            .where(eq(trackers.id, existing.id));
        } else {
          // Create new tracker record.
          await db.insert(trackers).values({
            websiteId,
            name: item.name,
            type: item.type,
            domain: item.domain,
            identifier: dedupKey,
            description: item.signature
              ? `Detected by scanner — ${item.signature.category} tracker`
              : "Detected by scanner",
            detectionMethod: "scan",
            status: "active",
            isEssential: false,
            firstSeenAt: now,
            lastSeenAt: now,
          }).onConflictDoNothing();
        }
      }
    }

    // Mark scan as completed.
    await db
      .update(scans)
      .set({
        status: "completed",
        pagesScanned: 1,
        itemsDetected: result.items.length,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(scans.id, scan.id));

    return scan.id;
  } catch (error) {
    // Unexpected error — mark scan as failed.
    const msg =
      error instanceof ScannerUrlError
        ? error.message
        : "Unexpected scanner error";

    await db
      .update(scans)
      .set({
        status: "failed",
        errorMessage: msg,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(scans.id, scan.id));

    logger.error("Scanner run failed", {
      operation: "scanner.run",
      scanId: scan.id,
      websiteId,
      error,
    });

    return scan.id;
  }
}
