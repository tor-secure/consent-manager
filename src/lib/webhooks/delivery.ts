import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { webhookDeliveries } from "@/db/schema/webhook-deliveries";
import { webhookEndpoints } from "@/db/schema/webhook-endpoints";
import { logger } from "@/lib/logger";

export const WEBHOOK_SIGNATURE_HEADER = "X-CMP-Signature";
export const WEBHOOK_TIMESTAMP_HEADER = "X-CMP-Timestamp";
export const WEBHOOK_EVENT_ID_HEADER = "X-CMP-Event-Id";
export const WEBHOOK_EVENT_TYPE_HEADER = "X-CMP-Event-Type";

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = [250, 1_000] as const;
const MAX_RESPONSE_BODY_CHARS = 2_000;

export type WebhookEvent = {
  organizationId: string;
  eventId?: string | null;
  eventType: string;
  payload: Record<string, unknown>;
};

type WebhookEndpointForDelivery = {
  id: string;
  organizationId: string;
  url: string;
  subscribedEvents: string[];
  signingSecretHash: string | null;
};

type AttemptResult = {
  status: "success" | "failed" | "retrying";
  responseStatusCode: number | null;
  responseBody: string | null;
  errorMessage: string | null;
};

type DeliveryDeps = {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  recordAttempt?: (attempt: {
    endpointId: string;
    eventId: string;
    eventType: string;
    attemptNumber: number;
    payload: Record<string, unknown>;
    status: AttemptResult["status"];
    responseStatusCode: number | null;
    responseBody: string | null;
    errorMessage: string | null;
    sentAt: Date;
    completedAt: Date;
    nextRetryAt: Date | null;
  }) => Promise<void>;
  markEndpointDelivered?: (endpointId: string, deliveredAt: Date) => Promise<void>;
  timeoutMs?: number;
  maxAttempts?: number;
  backoffMs?: readonly number[];
};

export function createWebhookSignature({
  payload,
  timestamp,
  signingSecretHash,
}: {
  payload: string;
  timestamp: string;
  signingSecretHash: string;
}): string {
  return createHmac("sha256", signingSecretHash)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
}

export function verifyWebhookSignature({
  payload,
  timestamp,
  signingSecretHash,
  signature,
}: {
  payload: string;
  timestamp: string;
  signingSecretHash: string;
  signature: string;
}): boolean {
  const expected = createWebhookSignature({ payload, timestamp, signingSecretHash });
  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function shouldRetryDelivery(statusCode: number | null, errorMessage: string | null): boolean {
  if (statusCode === null) return Boolean(errorMessage);
  return statusCode === 408 || statusCode === 429 || statusCode >= 500;
}

export function sanitizeWebhookResponseBody(body: string): string {
  return body.slice(0, MAX_RESPONSE_BODY_CHARS);
}

async function defaultRecordAttempt(attempt: Parameters<NonNullable<DeliveryDeps["recordAttempt"]>>[0]) {
  await db.insert(webhookDeliveries).values({
    webhookEndpointId: attempt.endpointId,
    eventId: attempt.eventId,
    eventType: attempt.eventType,
    status: attempt.status,
    attemptNumber: attempt.attemptNumber,
    requestPayload: attempt.payload,
    responseStatusCode: attempt.responseStatusCode,
    responseBody: attempt.responseBody,
    errorMessage: attempt.errorMessage,
    sentAt: attempt.sentAt,
    completedAt: attempt.completedAt,
    nextRetryAt: attempt.nextRetryAt,
  });
}

async function defaultMarkEndpointDelivered(endpointId: string, deliveredAt: Date) {
  await db
    .update(webhookEndpoints)
    .set({ lastDeliveryAt: deliveredAt, updatedAt: deliveredAt })
    .where(eq(webhookEndpoints.id, endpointId));
}

function buildSignedRequest(event: WebhookEvent, endpoint: WebhookEndpointForDelivery) {
  const eventId = event.eventId ?? randomUUID();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify({
    id: eventId,
    type: event.eventType,
    organizationId: event.organizationId,
    data: event.payload,
  });

  if (!endpoint.signingSecretHash) {
    throw new Error("Webhook endpoint is missing a signing secret");
  }

  const signature = createWebhookSignature({
    payload: body,
    timestamp,
    signingSecretHash: endpoint.signingSecretHash,
  });

  return {
    eventId,
    body,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "CMP-Webhooks/1.0",
      [WEBHOOK_SIGNATURE_HEADER]: `sha256=${signature}`,
      [WEBHOOK_TIMESTAMP_HEADER]: timestamp,
      [WEBHOOK_EVENT_ID_HEADER]: eventId,
      [WEBHOOK_EVENT_TYPE_HEADER]: event.eventType,
    },
  };
}

export async function deliverWebhookToEndpoint(
  endpoint: WebhookEndpointForDelivery,
  event: WebhookEvent,
  deps: DeliveryDeps = {},
) {
  if (endpoint.organizationId !== event.organizationId) {
    throw new Error("Webhook endpoint does not belong to the event organization");
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const sleep = deps.sleep ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const recordAttempt = deps.recordAttempt ?? defaultRecordAttempt;
  const markEndpointDelivered = deps.markEndpointDelivered ?? defaultMarkEndpointDelivered;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = Math.max(1, deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const backoffMs = deps.backoffMs ?? DEFAULT_BACKOFF_MS;
  const request = buildSignedRequest(event, endpoint);

  let finalStatus: AttemptResult["status"] = "failed";

  for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
    const sentAt = new Date();
    let result: AttemptResult;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(endpoint.url, {
          method: "POST",
          headers: request.headers,
          body: request.body,
          signal: controller.signal,
        });
        const responseText = sanitizeWebhookResponseBody(await response.text());

        result = {
          status: response.ok ? "success" : "failed",
          responseStatusCode: response.status,
          responseBody: responseText,
          errorMessage: response.ok ? null : `Webhook endpoint returned HTTP ${response.status}`,
        };
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      result = {
        status: "failed",
        responseStatusCode: null,
        responseBody: null,
        errorMessage: error instanceof Error && error.name === "AbortError"
          ? "Webhook delivery timed out"
          : "Webhook delivery failed",
      };
    }

    const isRetryable = shouldRetryDelivery(result.responseStatusCode, result.errorMessage);
    const willRetry = result.status !== "success" && isRetryable && attemptNumber < maxAttempts;
    const completedAt = new Date();
    const nextRetryAt = willRetry
      ? new Date(completedAt.getTime() + (backoffMs[attemptNumber - 1] ?? backoffMs[backoffMs.length - 1] ?? 0))
      : null;

    await recordAttempt({
      endpointId: endpoint.id,
      eventId: request.eventId,
      eventType: event.eventType,
      attemptNumber,
      payload: JSON.parse(request.body) as Record<string, unknown>,
      status: willRetry ? "retrying" : result.status,
      responseStatusCode: result.responseStatusCode,
      responseBody: result.responseBody,
      errorMessage: result.errorMessage,
      sentAt,
      completedAt,
      nextRetryAt,
    });

    if (result.status === "success") {
      await markEndpointDelivered(endpoint.id, completedAt);
      finalStatus = "success";
      break;
    }

    finalStatus = willRetry ? "retrying" : "failed";
    if (!willRetry) break;

    if (willRetry && nextRetryAt) {
      await sleep(Math.max(0, nextRetryAt.getTime() - completedAt.getTime()));
    }
  }

  return { endpointId: endpoint.id, status: finalStatus };
}

export async function deliverWebhookEvent(event: WebhookEvent) {
  const endpoints = await db
    .select({
      id: webhookEndpoints.id,
      organizationId: webhookEndpoints.organizationId,
      url: webhookEndpoints.url,
      subscribedEvents: webhookEndpoints.subscribedEvents,
      signingSecretHash: webhookEndpoints.signingSecretHash,
    })
    .from(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.organizationId, event.organizationId),
        eq(webhookEndpoints.status, "active"),
      ),
    );

  const subscribedEndpoints = endpoints.filter((endpoint) =>
    (endpoint.subscribedEvents ?? []).includes(event.eventType),
  );

  const results = [];
  for (const endpoint of subscribedEndpoints) {
    try {
      results.push(await deliverWebhookToEndpoint(endpoint, event));
    } catch (error) {
      logger.error("Webhook delivery failed before attempt", {
        operation: "webhook.delivery",
        endpointId: endpoint.id,
        eventType: event.eventType,
        error,
      });
      results.push({ endpointId: endpoint.id, status: "failed" as const });
    }
  }

  return results;
}
