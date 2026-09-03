import "server-only";

import { and, eq, isNull, lte, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { websiteScanSchedules } from "@/db/schema/website-scan-schedules";
import { websites } from "@/db/schema/websites";
import { notifications } from "@/db/schema/notifications";
import { logger } from "@/lib/logger";
import {
  assertSafeScanUrl,
  toAbsoluteScanUrl,
} from "@/lib/scanner/ssrf-guard";
import { runScan, websiteHasRunningScan } from "@/lib/scanner/scan-engine";
import {
  executeDueScans,
  sanitizeScanError,
  type ScheduleCandidate,
} from "@/lib/scanner/scan-schedule";

export async function touchScheduleAfterScan(input: {
  websiteId: string;
  scanId: string;
  status: string;
  errorMessage: string | null;
}): Promise<void> {
  const now = new Date();
  const [existing] = await db
    .select({
      id: websiteScanSchedules.id,
      consecutiveFailures: websiteScanSchedules.consecutiveFailures,
    })
    .from(websiteScanSchedules)
    .where(eq(websiteScanSchedules.websiteId, input.websiteId))
    .limit(1);

  if (!existing) return;

  const consecutiveFailures =
    input.status === "completed" ? 0 : existing.consecutiveFailures + 1;

  await db
    .update(websiteScanSchedules)
    .set({
      lastScanAt: now,
      lastScanStatus: input.status,
      lastScanId: input.scanId && input.scanId.length === 36 ? input.scanId : null,
      lastError: sanitizeScanError(input.errorMessage),
      consecutiveFailures,
      lockedUntil: null,
      updatedAt: now,
    })
    .where(eq(websiteScanSchedules.id, existing.id));
}

export async function runDueScheduledScans() {
  return executeDueScans({
    now: () => new Date(),
    toAbsoluteScanUrl,
    assertSafeScanUrl,
    runScan: async (websiteId, domain, options) =>
      runScan(websiteId, domain, options),
    hasRunningScan: websiteHasRunningScan,
    listCandidates: async (): Promise<ScheduleCandidate[]> => {
      const rows = await db
        .select({
          id: websiteScanSchedules.id,
          organizationId: websiteScanSchedules.organizationId,
          websiteId: websiteScanSchedules.websiteId,
          enabled: websiteScanSchedules.enabled,
          frequency: websiteScanSchedules.frequency,
          nextScanAt: websiteScanSchedules.nextScanAt,
          lastScanAt: websiteScanSchedules.lastScanAt,
          lockedUntil: websiteScanSchedules.lockedUntil,
          consecutiveFailures: websiteScanSchedules.consecutiveFailures,
          websiteStatus: websites.status,
          websiteDeletedAt: websites.deletedAt,
          websiteDomain: websites.domain,
        })
        .from(websiteScanSchedules)
        .innerJoin(websites, eq(websites.id, websiteScanSchedules.websiteId));
      return rows;
    },
    claim: async (scheduleId, lockedUntil) => {
      const now = new Date();
      const [claimed] = await db
        .update(websiteScanSchedules)
        .set({ lockedUntil, updatedAt: now })
        .where(
          and(
            eq(websiteScanSchedules.id, scheduleId),
            eq(websiteScanSchedules.enabled, true),
            or(
              isNull(websiteScanSchedules.lockedUntil),
              lte(websiteScanSchedules.lockedUntil, now),
            ),
          ),
        )
        .returning({ id: websiteScanSchedules.id });
      return Boolean(claimed);
    },
    recordOutcome: async (input) => {
      await db
        .update(websiteScanSchedules)
        .set({
          lastScanAt: input.lastScanAt,
          lastScanStatus: input.status,
          lastScanId: input.scanId && input.scanId.length === 36 ? input.scanId : null,
          lastError: sanitizeScanError(input.errorMessage),
          consecutiveFailures: input.consecutiveFailures,
          nextScanAt: input.nextScanAt,
          lockedUntil: null,
          updatedAt: input.lastScanAt,
        })
        .where(
          and(
            eq(websiteScanSchedules.id, input.scheduleId),
            eq(websiteScanSchedules.organizationId, input.organizationId),
            eq(websiteScanSchedules.websiteId, input.websiteId),
          ),
        );
    },
    notifyFailure: async (input) => {
      await db.insert(notifications).values({
        organizationId: input.organizationId,
        userId: null,
        type: "scan.schedule_failed",
        priority: "high",
        title: "Scheduled privacy scan failed",
        message: `Automatic scanning failed ${input.consecutiveFailures} times in a row.`,
        resourceType: "website",
        resourceId: input.websiteId,
        metadata: {
          fingerprint: `scan.schedule_failed:${input.websiteId}:${input.consecutiveFailures}`,
          websiteId: input.websiteId,
          consecutiveFailures: input.consecutiveFailures,
          error: sanitizeScanError(input.errorMessage),
        },
      });
      logger.warn("Repeated scheduled scan failures", {
        operation: "scanner.schedule.failure",
        websiteId: input.websiteId,
        consecutiveFailures: input.consecutiveFailures,
      });
    },
  });
}

export async function unlockStaleScheduleLocks(): Promise<void> {
  const now = new Date();
  await db
    .update(websiteScanSchedules)
    .set({ lockedUntil: null, updatedAt: now })
    .where(
      and(
        sql`${websiteScanSchedules.lockedUntil} is not null`,
        lte(websiteScanSchedules.lockedUntil, now),
      ),
    );
}
