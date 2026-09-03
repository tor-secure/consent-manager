import "server-only";
import { eq, and, gte, inArray } from "drizzle-orm";

import { db } from "@/db";
import { scans } from "@/db/schema/scans";
import { scanResults } from "@/db/schema/scan-results";
import { trackers } from "@/db/schema/trackers";
import { logger } from "@/lib/logger";
import { analyseUrl } from "./html-analyser";
import { toAbsoluteScanUrl, ScannerUrlError } from "./ssrf-guard";
import { runDriftForScan } from "@/lib/monitoring/process-scan-drift";
import { SCAN_LOCK_MS, type ScanTrigger } from "./scan-schedule";

const SCANNER_VERSION = "1.0.0";

export type RunScanResult = {
  scanId: string;
  status: "running" | "completed" | "failed";
  errorMessage: string | null;
};

export async function websiteHasRunningScan(websiteId: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - SCAN_LOCK_MS);
  const [row] = await db
    .select({ id: scans.id })
    .from(scans)
    .where(
      and(
        eq(scans.websiteId, websiteId),
        inArray(scans.status, ["running", "queued"]),
        gte(scans.startedAt, cutoff),
      ),
    )
    .limit(1);
  return Boolean(row);
}

// ---------------------------------------------------------------------------
// runScan
//
// Creates a scan record, fetches + analyses the URL, persists results, and
// upserts tracker records. Manual and scheduled scans share this function.
// ---------------------------------------------------------------------------

export async function runScan(
  websiteId: string,
  websiteUrl: string,
  options: { triggeredBy?: ScanTrigger } = {},
): Promise<RunScanResult> {
  const triggeredBy = options.triggeredBy === "scheduled" ? "scheduled" : "manual";

  const [scan] = await db
    .insert(scans)
    .values({
      websiteId,
      status: "running",
      scanType: "quick",
      triggeredBy,
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

      return { scanId: scan.id, status: "failed", errorMessage: result.fetchError };
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
            pageUrl: result.url,
            wouldExecuteOnParse: item.wouldExecuteOnParse,
            cmpPurposeValue: item.cmpPurposeValue,
            resourceKind: item.resourceKind,
          } as Record<string, unknown>,
          pageUrl: result.url,
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

    try {
      await runDriftForScan(scan.id, websiteId);
    } catch (driftError) {
      logger.error("Privacy drift processing failed after successful scan", {
        operation: "monitoring.drift",
        scanId: scan.id,
        websiteId,
        error: driftError,
      });
    }

    return { scanId: scan.id, status: "completed", errorMessage: null };
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

    return { scanId: scan.id, status: "failed", errorMessage: msg };
  }
}
