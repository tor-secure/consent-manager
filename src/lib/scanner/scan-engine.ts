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
import { websites } from "@/db/schema/websites";
import { loadConsentGraph } from "@/lib/intelligence/graph-snapshot";
import { loadQualityScoreInput } from "@/lib/monitoring/privacy-intelligence";
import { calculateConsentQualityScore } from "@/lib/monitoring/consent-quality";
import { captureDigitalTwinSnapshot } from "@/lib/intelligence/service";
import { findBuiltinTracker } from "@/lib/sdk/tracker-catalog";
import { findMatchingTracker } from "@/lib/trackers/management";

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

    const existingTrackers = await db
      .select()
      .from(trackers)
      .where(eq(trackers.websiteId, websiteId));

    // Persist each detected item as a scan_result.
    if (result.items.length > 0) {
      await db.insert(scanResults).values(
        result.items.map((item) => {
          const matched = findMatchingTracker(existingTrackers, {
            url: item.identifier,
            domain: item.domain,
            identifier: item.identifier,
            kind: item.resourceKind,
          });
          const builtin = findBuiltinTracker(item.identifier) ?? findBuiltinTracker(item.domain);
          const configured = Boolean(matched?.purposeId || matched?.vendorId);
          return {
            scanId: scan.id,
            websiteId,
            vendorId: matched?.vendorId ?? null,
            purposeId: matched?.purposeId ?? null,
            type: item.type,
            name: item.name,
            domain: item.domain,
            identifier: item.identifier,
            classificationStatus: configured ? "mapped" : item.classificationStatus,
            riskLevel: item.riskLevel,
            details: {
              ...item.details,
              category: item.category,
              pageUrl: result.url,
              wouldExecuteOnParse: item.wouldExecuteOnParse,
              cmpPurposeValue: item.cmpPurposeValue,
              resourceKind: item.resourceKind,
              matchedTrackerId: matched?.id ?? null,
              matchedTrackerName: matched?.name ?? builtin?.name ?? null,
              mappingStatus: configured ? "configured" : "unmapped",
            } as Record<string, unknown>,
            pageUrl: result.url,
            detectedAt: now,
          };
        }),
      );

      for (const item of result.items) {
        const dedupKey = item.identifier ?? item.domain ?? item.name;
        if (!dedupKey) continue;
        const builtin =
          findBuiltinTracker(item.identifier) ??
          findBuiltinTracker(item.domain);
        const matched = findMatchingTracker(existingTrackers, {
          url: item.identifier,
          domain: item.domain,
          identifier: item.identifier,
          kind: item.resourceKind,
        });
        const existing = matched ?? existingTrackers.find((row) => row.identifier === dedupKey);

        if (existing) {
          const empty = (value: unknown) => !Array.isArray(value) || value.length === 0;
          await db
            .update(trackers)
            .set({
              lastSeenAt: now,
              updatedAt: now,
              ...(existing.domain || !item.domain ? {} : { domain: item.domain }),
              ...(existing.category || !builtin?.category ? {} : { category: builtin.category }),
              ...(empty(existing.cookieNames) && builtin?.cookieNames
                ? { cookieNames: builtin.cookieNames }
                : {}),
              ...(empty(existing.storageTypes) && builtin?.storageTypes
                ? { storageTypes: builtin.storageTypes }
                : {}),
              ...(empty(existing.localStorageKeys) && builtin?.localStorageKeys
                ? { localStorageKeys: builtin.localStorageKeys }
                : {}),
              ...(empty(existing.sessionStorageKeys) && builtin?.sessionStorageKeys
                ? { sessionStorageKeys: builtin.sessionStorageKeys }
                : {}),
              ...(empty(existing.scriptUrlPatterns) && builtin?.scriptUrlPatterns
                ? { scriptUrlPatterns: builtin.scriptUrlPatterns }
                : {}),
              ...(empty(existing.iframeUrlPatterns) && builtin?.iframeUrlPatterns
                ? { iframeUrlPatterns: builtin.iframeUrlPatterns }
                : {}),
              ...(empty(existing.pixelUrlPatterns) && builtin?.pixelUrlPatterns
                ? { pixelUrlPatterns: builtin.pixelUrlPatterns }
                : {}),
            })
            .where(eq(trackers.id, existing.id));
        } else {
          const [created] = await db.insert(trackers).values({
            websiteId,
            name: builtin?.name ?? item.name,
            type: item.type,
            domain: item.domain,
            identifier: dedupKey,
            description: item.signature
              ? `Detected by scanner — ${item.signature.category} tracker`
              : "Detected by scanner",
            category: builtin?.category ?? item.category ?? null,
            cookieNames: builtin?.cookieNames ?? [],
            storageTypes: builtin?.storageTypes ?? [],
            localStorageKeys: builtin?.localStorageKeys ?? [],
            sessionStorageKeys: builtin?.sessionStorageKeys ?? [],
            indexedDbNames: builtin?.indexedDbNames ?? [],
            scriptUrlPatterns: builtin?.scriptUrlPatterns ?? [],
            iframeUrlPatterns: builtin?.iframeUrlPatterns ?? [],
            pixelUrlPatterns: builtin?.pixelUrlPatterns ?? [],
            party: builtin?.party ?? "unknown",
            duration: builtin?.duration ?? null,
            deletionBehavior: builtin?.deletionBehavior ?? null,
            detectionMethod: "scan",
            status: "active",
            isEssential: false,
            scannerClassification: "unmapped",
            firstSeenAt: now,
            lastSeenAt: now,
          }).onConflictDoNothing().returning();
          if (created) existingTrackers.push(created);
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
    try {
      const [website] = await db
        .select({ organizationId: websites.organizationId })
        .from(websites)
        .where(eq(websites.id, websiteId))
        .limit(1);
      if (website) {
        const [graph, quality] = await Promise.all([
          loadConsentGraph(website.organizationId, websiteId),
          loadQualityScoreInput(websiteId),
        ]);
        if (graph && quality) {
          await captureDigitalTwinSnapshot({
            organizationId: website.organizationId,
            websiteId,
            source: "scan",
            sourceId: scan.id,
            graph,
            qualityInput: quality.input,
            qualityScore: calculateConsentQualityScore(quality.input).overall,
          });
        }
      }
    } catch (snapshotError) {
      logger.error("Digital twin snapshot failed after successful scan", {
        operation: "digital-twin.snapshot",
        scanId: scan.id,
        websiteId,
        error: snapshotError,
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
