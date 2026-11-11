import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNotNull, lte } from "drizzle-orm";

import { db } from "@/db";
import { purposes } from "@/db/schema/purposes";
import { vendors } from "@/db/schema/vendors";
import { websitePreferenceSyncDeliveries } from "@/db/schema/website-preference-sync-deliveries";
import { websitePreferenceSyncEndpoints } from "@/db/schema/website-preference-sync-endpoints";
import type { DecisionSnapshot } from "@/lib/consent/revocation-notification-core";
import { logger } from "@/lib/logger";
import { assertSafeScanUrl, ScannerUrlError } from "@/lib/scanner/ssrf-guard";
import {
  createWebhookSignature,
  sanitizeWebhookResponseBody,
  shouldRetryDelivery,
  WEBHOOK_EVENT_ID_HEADER,
  WEBHOOK_EVENT_TYPE_HEADER,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
} from "@/lib/webhooks/delivery";
import {
  buildPreferenceSyncEnvelope,
  PREFERENCE_SYNC_EVENT_TYPE,
  type PreferenceSyncEnvelope,
} from "@/lib/webhooks/preference-sync-core";

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = [250, 1_000] as const;
const CRON_RETRY_DELAY_MS = 60_000;

type AttemptStatus = "success" | "failed" | "retrying";

type RecordedAttempt = {
  endpointId: string;
  eventId: string;
  eventType: string;
  attemptNumber: number;
  payload: Record<string, unknown>;
  status: AttemptStatus;
  responseStatusCode: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  sentAt: Date;
  completedAt: Date;
  nextRetryAt: Date | null;
};

type DeliveryDeps = {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
  timeoutMs?: number;
  maxAttempts?: number;
  backoffMs?: readonly number[];
  cronRetryDelayMs?: number;
  recordAttempt?: (attempt: RecordedAttempt) => Promise<void>;
  markEndpointDelivered?: (endpointId: string, deliveredAt: Date) => Promise<void>;
};

export type PreferenceSyncEnqueueInput = {
  organizationId: string;
  websiteId: string;
  subjectKey: string;
  preferenceRevision: number;
  previous: DecisionSnapshot[];
  next: DecisionSnapshot[];
  fullWithdrawal?: boolean;
  hadPreviousRecord: boolean;
  eventId?: string;
  occurredAt?: Date;
};

async function loadNameMaps(
  organizationId: string,
  decisions: DecisionSnapshot[],
): Promise<{ purposes: Record<string, string>; vendors: Record<string, string> }> {
  const purposeIds = [
    ...new Set(decisions.map((row) => row.purposeId).filter((id): id is string => Boolean(id))),
  ];
  const vendorIds = [
    ...new Set(decisions.map((row) => row.vendorId).filter((id): id is string => Boolean(id))),
  ];
  const purposesMap: Record<string, string> = {};
  const vendorsMap: Record<string, string> = {};

  if (purposeIds.length > 0) {
    const rows = await db
      .select({ id: purposes.id, name: purposes.name })
      .from(purposes)
      .where(and(eq(purposes.organizationId, organizationId), inArray(purposes.id, purposeIds)));
    for (const row of rows) purposesMap[row.id] = row.name;
  }
  if (vendorIds.length > 0) {
    const rows = await db
      .select({ id: vendors.id, name: vendors.name })
      .from(vendors)
      .where(and(eq(vendors.organizationId, organizationId), inArray(vendors.id, vendorIds)));
    for (const row of rows) vendorsMap[row.id] = row.name;
  }
  return { purposes: purposesMap, vendors: vendorsMap };
}

function buildSignedBody(envelope: PreferenceSyncEnvelope, signingSecretEnc: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify(envelope);
  const signature = createWebhookSignature({
    payload: body,
    timestamp,
    signingSecretHash: signingSecretEnc,
  });
  return {
    body,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "CMP-PreferenceSync/1.0",
      [WEBHOOK_SIGNATURE_HEADER]: `sha256=${signature}`,
      [WEBHOOK_TIMESTAMP_HEADER]: timestamp,
      [WEBHOOK_EVENT_ID_HEADER]: envelope.id,
      [WEBHOOK_EVENT_TYPE_HEADER]: envelope.type,
    } as Record<string, string>,
  };
}

async function recordAttempt(input: {
  endpointId: string;
  eventId: string;
  eventType: string;
  attemptNumber: number;
  payload: Record<string, unknown>;
  status: AttemptStatus;
  responseStatusCode: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  sentAt: Date;
  completedAt: Date;
  nextRetryAt: Date | null;
}) {
  await db.insert(websitePreferenceSyncDeliveries).values({
    endpointId: input.endpointId,
    eventId: input.eventId,
    eventType: input.eventType,
    status: input.status,
    attemptNumber: input.attemptNumber,
    requestPayload: input.payload,
    responseStatusCode: input.responseStatusCode,
    responseBody: input.responseBody,
    errorMessage: input.errorMessage,
    sentAt: input.sentAt,
    completedAt: input.completedAt,
    nextRetryAt: input.nextRetryAt,
  });
}

export async function deliverPreferenceSyncEnvelope(input: {
  endpoint: {
    id: string;
    organizationId: string;
    url: string;
    signingSecretEnc: string;
  };
  envelope: PreferenceSyncEnvelope;
  startAttemptNumber?: number;
  deps?: DeliveryDeps;
}): Promise<{ status: AttemptStatus; eventId: string }> {
  const deps = input.deps ?? {};
  const fetchImpl = deps.fetchImpl ?? fetch;
  const sleep = deps.sleep ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = Math.max(1, deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const backoffMs = deps.backoffMs ?? DEFAULT_BACKOFF_MS;
  const cronRetryDelayMs = deps.cronRetryDelayMs ?? CRON_RETRY_DELAY_MS;
  const startAttempt = Math.max(1, input.startAttemptNumber ?? 1);

  const safeUrl = await assertSafeScanUrl(input.endpoint.url);
  if (process.env.NODE_ENV === "production" && safeUrl.protocol !== "https:") {
    throw new ScannerUrlError("Preference sync URL must use HTTPS");
  }

  const signed = buildSignedBody(input.envelope, input.endpoint.signingSecretEnc);
  const payload = JSON.parse(signed.body) as Record<string, unknown>;
  const record = deps.recordAttempt ?? recordAttempt;
  const markDelivered =
    deps.markEndpointDelivered ??
    (async (endpointId: string, deliveredAt: Date) => {
      await db
        .update(websitePreferenceSyncEndpoints)
        .set({ lastDeliveryAt: deliveredAt, updatedAt: deliveredAt })
        .where(eq(websitePreferenceSyncEndpoints.id, endpointId));
    });
  let finalStatus: AttemptStatus = "failed";

  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const attemptNumber = startAttempt + offset;
    const sentAt = deps.now?.() ?? new Date();
    let result: {
      status: "success" | "failed";
      responseStatusCode: number | null;
      responseBody: string | null;
      errorMessage: string | null;
    };

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(safeUrl.href, {
          method: "POST",
          headers: signed.headers,
          body: signed.body,
          signal: controller.signal,
          redirect: "manual",
        });
        if (response.status >= 300 && response.status < 400) {
          result = {
            status: "failed",
            responseStatusCode: response.status,
            responseBody: null,
            errorMessage: "Preference sync endpoint redirected to a disallowed location",
          };
        } else {
          const responseText = sanitizeWebhookResponseBody(await response.text());
          result = {
            status: response.ok ? "success" : "failed",
            responseStatusCode: response.status,
            responseBody: responseText,
            errorMessage: response.ok ? null : `Preference sync endpoint returned HTTP ${response.status}`,
          };
        }
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      result = {
        status: "failed",
        responseStatusCode: null,
        responseBody: null,
        errorMessage:
          error instanceof Error && error.name === "AbortError"
            ? "Preference sync delivery timed out"
            : "Preference sync delivery failed",
      };
    }

    const completedAt = deps.now?.() ?? new Date();
    const isRetryable = shouldRetryDelivery(result.responseStatusCode, result.errorMessage);
    const inProcessRetry =
      result.status !== "success" && isRetryable && offset < maxAttempts - 1;
    const durableRetry =
      result.status !== "success" && isRetryable && offset >= maxAttempts - 1;

    const nextRetryAt = inProcessRetry
      ? new Date(
          completedAt.getTime() + (backoffMs[offset] ?? backoffMs[backoffMs.length - 1] ?? 0),
        )
      : durableRetry
        ? new Date(completedAt.getTime() + cronRetryDelayMs)
        : null;

    const status: AttemptStatus = result.status === "success"
      ? "success"
      : inProcessRetry || durableRetry
        ? "retrying"
        : "failed";

    await record({
      endpointId: input.endpoint.id,
      eventId: input.envelope.id,
      eventType: input.envelope.type,
      attemptNumber,
      payload,
      status,
      responseStatusCode: result.responseStatusCode,
      responseBody: result.responseBody,
      errorMessage: result.errorMessage,
      sentAt,
      completedAt,
      nextRetryAt,
    });

    if (result.status === "success") {
      await markDelivered(input.endpoint.id, completedAt);
      return { status: "success", eventId: input.envelope.id };
    }

    finalStatus = status;
    if (!inProcessRetry) break;
    if (nextRetryAt) {
      await sleep(Math.max(0, nextRetryAt.getTime() - completedAt.getTime()));
    }
  }

  return { status: finalStatus, eventId: input.envelope.id };
}

/**
 * Diff + deliver preference sync for one account save.
 * No-ops when identical, empty, or no active endpoint.
 */
export async function enqueuePreferenceSync(
  input: PreferenceSyncEnqueueInput,
  deps?: DeliveryDeps,
): Promise<{ emitted: boolean; eventId?: string; status?: AttemptStatus; reason?: string }> {
  const [endpoint] = await db
    .select({
      id: websitePreferenceSyncEndpoints.id,
      organizationId: websitePreferenceSyncEndpoints.organizationId,
      url: websitePreferenceSyncEndpoints.url,
      signingSecretEnc: websitePreferenceSyncEndpoints.signingSecretEnc,
      status: websitePreferenceSyncEndpoints.status,
    })
    .from(websitePreferenceSyncEndpoints)
    .where(
      and(
        eq(websitePreferenceSyncEndpoints.websiteId, input.websiteId),
        eq(websitePreferenceSyncEndpoints.organizationId, input.organizationId),
        eq(websitePreferenceSyncEndpoints.status, "active"),
      ),
    )
    .limit(1);

  if (!endpoint) {
    return { emitted: false, reason: "no_endpoint" };
  }

  const names = await loadNameMaps(input.organizationId, [
    ...input.previous,
    ...input.next,
  ]);
  const eventId = input.eventId ?? randomUUID();
  const built = buildPreferenceSyncEnvelope({
    organizationId: input.organizationId,
    siteId: input.websiteId,
    subjectKey: input.subjectKey,
    preferenceRevision: input.preferenceRevision,
    previous: input.previous,
    next: input.next,
    names,
    fullWithdrawal: input.fullWithdrawal,
    occurredAt: input.occurredAt,
    eventId,
    hadPreviousRecord: input.hadPreviousRecord,
  });

  if (!built.shouldEmit) {
    return { emitted: false, reason: built.reason };
  }

  try {
    const result = await deliverPreferenceSyncEnvelope({
      endpoint,
      envelope: built.envelope,
      deps,
    });
    return { emitted: true, eventId: result.eventId, status: result.status };
  } catch (error) {
    logger.error("Preference sync delivery failed before attempt", {
      operation: "preference_sync.delivery",
      endpointId: endpoint.id,
      websiteId: input.websiteId,
      error,
    });
    return { emitted: true, eventId, status: "failed" };
  }
}

export async function retryDuePreferenceSyncDeliveries(
  deps?: DeliveryDeps & { limit?: number },
): Promise<{ claimed: number; succeeded: number; failed: number; retrying: number }> {
  const now = deps?.now?.() ?? new Date();
  const limit = Math.max(1, deps?.limit ?? 25);

  const due = await db
    .select({
      id: websitePreferenceSyncDeliveries.id,
      endpointId: websitePreferenceSyncDeliveries.endpointId,
      eventId: websitePreferenceSyncDeliveries.eventId,
      attemptNumber: websitePreferenceSyncDeliveries.attemptNumber,
      requestPayload: websitePreferenceSyncDeliveries.requestPayload,
      nextRetryAt: websitePreferenceSyncDeliveries.nextRetryAt,
    })
    .from(websitePreferenceSyncDeliveries)
    .where(
      and(
        eq(websitePreferenceSyncDeliveries.status, "retrying"),
        isNotNull(websitePreferenceSyncDeliveries.nextRetryAt),
        lte(websitePreferenceSyncDeliveries.nextRetryAt, now),
      ),
    )
    .orderBy(asc(websitePreferenceSyncDeliveries.nextRetryAt))
    .limit(limit * 4);

  // Keep the latest due row per eventId.
  const latestByEvent = new Map<string, (typeof due)[number]>();
  for (const row of due) {
    const existing = latestByEvent.get(row.eventId);
    if (!existing || row.attemptNumber >= existing.attemptNumber) {
      latestByEvent.set(row.eventId, row);
    }
  }

  const jobs = [...latestByEvent.values()].slice(0, limit);
  let succeeded = 0;
  let failed = 0;
  let retrying = 0;

  for (const job of jobs) {
    const [endpoint] = await db
      .select({
        id: websitePreferenceSyncEndpoints.id,
        organizationId: websitePreferenceSyncEndpoints.organizationId,
        url: websitePreferenceSyncEndpoints.url,
        signingSecretEnc: websitePreferenceSyncEndpoints.signingSecretEnc,
        status: websitePreferenceSyncEndpoints.status,
      })
      .from(websitePreferenceSyncEndpoints)
      .where(
        and(
          eq(websitePreferenceSyncEndpoints.id, job.endpointId),
          eq(websitePreferenceSyncEndpoints.status, "active"),
        ),
      )
      .limit(1);

    if (!endpoint) {
      await db
        .update(websitePreferenceSyncDeliveries)
        .set({
          status: "failed",
          errorMessage: "Preference sync endpoint missing or disabled",
          completedAt: now,
          nextRetryAt: null,
        })
        .where(eq(websitePreferenceSyncDeliveries.id, job.id));
      failed += 1;
      continue;
    }

    const envelope = job.requestPayload as PreferenceSyncEnvelope;
    if (!envelope?.id || envelope.type !== PREFERENCE_SYNC_EVENT_TYPE) {
      failed += 1;
      continue;
    }

    // Clear due marker on the claimed row so concurrent cron ticks skip it.
    await db
      .update(websitePreferenceSyncDeliveries)
      .set({ nextRetryAt: null })
      .where(eq(websitePreferenceSyncDeliveries.id, job.id));

    const result = await deliverPreferenceSyncEnvelope({
      endpoint,
      envelope,
      startAttemptNumber: job.attemptNumber + 1,
      deps: { ...deps, maxAttempts: 1 },
    });

    if (result.status === "success") succeeded += 1;
    else if (result.status === "retrying") retrying += 1;
    else failed += 1;
  }

  return { claimed: jobs.length, succeeded, failed, retrying };
}
