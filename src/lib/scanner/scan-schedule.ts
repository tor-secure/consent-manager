export const SCAN_FREQUENCIES = ["daily", "weekly", "monthly"] as const;

export type ScanFrequency = (typeof SCAN_FREQUENCIES)[number];

export type ScanTrigger = "manual" | "scheduled";

export const SCAN_LOCK_MS = 20 * 60 * 1000;
export const MAX_SCHEDULED_SCANS_PER_TICK = 5;

const MIN_INTERVAL_MS: Record<ScanFrequency, number> = {
  daily: 20 * 60 * 60 * 1000,
  weekly: 6 * 24 * 60 * 60 * 1000,
  monthly: 25 * 24 * 60 * 60 * 1000,
};

export function isScanFrequency(value: string): value is ScanFrequency {
  return (SCAN_FREQUENCIES as readonly string[]).includes(value);
}

export function normalizeTimezone(value: string | null | undefined): string {
  const trimmed = (value ?? "UTC").trim() || "UTC";
  try {
    Intl.DateTimeFormat("en-US", { timeZone: trimmed });
    return trimmed.slice(0, 100);
  } catch {
    return "UTC";
  }
}

export function computeNextScanAt(
  from: Date,
  frequency: ScanFrequency,
): Date {
  const next = new Date(from.getTime());
  if (frequency === "daily") {
    next.setUTCDate(next.getUTCDate() + 1);
    return next;
  }
  if (frequency === "weekly") {
    next.setUTCDate(next.getUTCDate() + 7);
    return next;
  }
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

export type ScheduleCandidate = {
  id: string;
  organizationId: string;
  websiteId: string;
  enabled: boolean;
  frequency: string;
  nextScanAt: Date | null;
  lastScanAt: Date | null;
  lockedUntil: Date | null;
  consecutiveFailures: number;
  websiteStatus: string;
  websiteDeletedAt: Date | null;
  websiteDomain: string;
};

export function isScheduleDue(
  row: Pick<
    ScheduleCandidate,
    "enabled" | "nextScanAt" | "websiteStatus" | "websiteDeletedAt"
  >,
  now: Date,
): boolean {
  if (!row.enabled) return false;
  if (row.websiteDeletedAt) return false;
  if (row.websiteStatus !== "active") return false;
  if (!row.nextScanAt) return false;
  return row.nextScanAt.getTime() <= now.getTime();
}

export function isLockHeld(lockedUntil: Date | null, now: Date): boolean {
  return Boolean(lockedUntil && lockedUntil.getTime() > now.getTime());
}

export function isWithinMinInterval(
  frequency: ScanFrequency,
  lastScanAt: Date | null,
  now: Date,
): boolean {
  if (!lastScanAt) return false;
  return now.getTime() - lastScanAt.getTime() < MIN_INTERVAL_MS[frequency];
}

export function canStartScheduledScan(input: {
  due: boolean;
  lockHeld: boolean;
  hasRunningScan: boolean;
  frequency: ScanFrequency;
  lastScanAt: Date | null;
  now: Date;
}): { ok: true } | { ok: false; reason: string } {
  if (!input.due) return { ok: false, reason: "not_due" };
  if (input.lockHeld) return { ok: false, reason: "locked" };
  if (input.hasRunningScan) return { ok: false, reason: "running" };
  if (isWithinMinInterval(input.frequency, input.lastScanAt, input.now)) {
    return { ok: false, reason: "min_interval" };
  }
  return { ok: true };
}

export function selectDueSchedules(
  rows: ScheduleCandidate[],
  now: Date,
  limit = MAX_SCHEDULED_SCANS_PER_TICK,
): ScheduleCandidate[] {
  return rows
    .filter((row) => isScheduleDue(row, now) && !isLockHeld(row.lockedUntil, now))
    .sort((a, b) => (a.nextScanAt?.getTime() ?? 0) - (b.nextScanAt?.getTime() ?? 0))
    .slice(0, Math.max(0, limit));
}

export function shouldNotifyRepeatedScanFailure(consecutiveFailures: number): boolean {
  return consecutiveFailures === 3 || consecutiveFailures === 6 || consecutiveFailures === 12;
}

export function sanitizeScanError(message: string | null | undefined): string | null {
  if (!message) return null;
  return message.replace(/\s+/g, " ").trim().slice(0, 500);
}

export type ScheduledScanDeps = {
  listCandidates: () => Promise<ScheduleCandidate[]>;
  claim: (scheduleId: string, lockedUntil: Date) => Promise<boolean>;
  hasRunningScan: (websiteId: string) => Promise<boolean>;
  assertSafeScanUrl: (absoluteUrl: string) => Promise<unknown>;
  toAbsoluteScanUrl: (domain: string) => string;
  runScan: (
    websiteId: string,
    domain: string,
    options: { triggeredBy: ScanTrigger },
  ) => Promise<{ scanId: string; status: string; errorMessage: string | null }>;
  recordOutcome: (input: {
    scheduleId: string;
    websiteId: string;
    organizationId: string;
    scanId: string;
    status: string;
    errorMessage: string | null;
    nextScanAt: Date;
    consecutiveFailures: number;
    lastScanAt: Date;
  }) => Promise<void>;
  notifyFailure: (input: {
    organizationId: string;
    websiteId: string;
    consecutiveFailures: number;
    errorMessage: string | null;
  }) => Promise<void>;
  now: () => Date;
};

export async function executeDueScans(deps: ScheduledScanDeps): Promise<{
  considered: number;
  started: number;
  skipped: number;
  failed: number;
  completed: number;
}> {
  const now = deps.now();
  const due = selectDueSchedules(await deps.listCandidates(), now);
  let started = 0;
  let skipped = 0;
  let failed = 0;
  let completed = 0;

  for (const row of due) {
    if (!isScanFrequency(row.frequency)) {
      skipped += 1;
      continue;
    }

    const running = await deps.hasRunningScan(row.websiteId);
    const gate = canStartScheduledScan({
      due: true,
      lockHeld: false,
      hasRunningScan: running,
      frequency: row.frequency,
      lastScanAt: row.lastScanAt,
      now,
    });
    if (!gate.ok) {
      skipped += 1;
      continue;
    }

    const claimed = await deps.claim(
      row.id,
      new Date(now.getTime() + SCAN_LOCK_MS),
    );
    if (!claimed) {
      skipped += 1;
      continue;
    }

    started += 1;
    let scanStatus = "failed";
    let scanId = "";
    let errorMessage: string | null = "Scheduled scan did not start";

    try {
      const absolute = deps.toAbsoluteScanUrl(row.websiteDomain);
      await deps.assertSafeScanUrl(absolute);
      const result = await deps.runScan(row.websiteId, row.websiteDomain, {
        triggeredBy: "scheduled",
      });
      scanId = result.scanId;
      scanStatus = result.status;
      errorMessage = sanitizeScanError(result.errorMessage);
    } catch (error) {
      scanStatus = "failed";
      errorMessage = sanitizeScanError(
        error instanceof Error ? error.message : "Scheduled scan failed",
      );
    }

    const consecutiveFailures =
      scanStatus === "completed" ? 0 : row.consecutiveFailures + 1;

    await deps.recordOutcome({
      scheduleId: row.id,
      websiteId: row.websiteId,
      organizationId: row.organizationId,
      scanId,
      status: scanStatus,
      errorMessage,
      nextScanAt: computeNextScanAt(now, row.frequency),
      consecutiveFailures,
      lastScanAt: now,
    });

    if (scanStatus === "completed") {
      completed += 1;
    } else {
      failed += 1;
      if (shouldNotifyRepeatedScanFailure(consecutiveFailures)) {
        await deps.notifyFailure({
          organizationId: row.organizationId,
          websiteId: row.websiteId,
          consecutiveFailures,
          errorMessage,
        });
      }
    }
  }

  return { considered: due.length, started, skipped, failed, completed };
}
