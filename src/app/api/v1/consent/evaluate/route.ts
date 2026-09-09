import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { authenticateApiKey } from "@/lib/api-key-auth";
import {
  evaluateConsentForTenant,
  logConsentEvaluation,
} from "@/lib/consent-evaluation";
import { parseConsentEvaluationBody } from "@/lib/consent-evaluation-http";
import { logger } from "@/lib/logger";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { readPublicJsonObject } from "@/lib/sdk/public-http";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function POST(request: Request) {
  const requestId = resolveRequestId(request);
  try {
    const ip = getClientIp(request);
    const unauthenticatedLimit = rateLimit({
      key: `consent-evaluate-ip:${ip}`,
      limit: 120,
      windowMs: 60_000,
    });
    if (!unauthenticatedLimit.allowed) {
      return errorResponse(
        requestId,
        429,
        "RATE_LIMITED",
        "Too many requests",
        unauthenticatedLimit.retryAfterSeconds,
      );
    }

    const authentication = await authenticateApiKey(request, "consent:evaluate");
    if (!authentication.ok) {
      if (authentication.reason === "insufficient_scope") {
        return errorResponse(
          requestId,
          403,
          "INSUFFICIENT_SCOPE",
          "API key lacks the required scope",
        );
      }
      return errorResponse(
        requestId,
        401,
        authentication.reason === "missing"
          ? "AUTHENTICATION_REQUIRED"
          : "INVALID_API_KEY",
        "A valid bearer API key is required",
      );
    }

    const keyLimit = rateLimit({
      key: `consent-evaluate-key:${authentication.context.apiKeyId}:${ip}`,
      limit: 600,
      windowMs: 60_000,
    });
    if (!keyLimit.allowed) {
      return errorResponse(
        requestId,
        429,
        "RATE_LIMITED",
        "Too many requests",
        keyLimit.retryAfterSeconds,
      );
    }

    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return errorResponse(
        requestId,
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Content-Type must be application/json",
      );
    }

    const json = await readPublicJsonObject(request);
    if (!json.ok) {
      return errorResponse(requestId, json.status, "INVALID_REQUEST", json.message);
    }
    const parsed = parseConsentEvaluationBody(json.body);
    if (!parsed.ok) {
      return errorResponse(
        requestId,
        400,
        parsed.error.code,
        parsed.error.message,
      );
    }

    const evaluation = await evaluateConsentForTenant(
      {
        organizationId: authentication.context.organizationId,
        websiteId: parsed.value.websiteId,
        consentId: parsed.value.consentId,
      },
      parsed.value.request,
    );
    if (!evaluation) {
      return errorResponse(
        requestId,
        404,
        "CONSENT_NOT_FOUND",
        "Consent record not found",
      );
    }

    await logConsentEvaluation({
      organizationId: authentication.context.organizationId,
      apiKeyId: authentication.context.apiKeyId,
      requestId,
      source: "api",
      evaluation,
      request: parsed.value.request,
    });

    return NextResponse.json(
      {
        success: true,
        requestId,
        allowed: evaluation.result.allowed,
        reasonCode: evaluation.result.reasonCode,
        consentState: evaluation.result.consentState,
        results: evaluation.result.results,
      },
      { headers: { ...RESPONSE_HEADERS, "X-Request-Id": requestId } },
    );
  } catch (error) {
    logger.error("Consent evaluation failed", {
      route: "POST /api/v1/consent/evaluate",
      operation: "consent.evaluate",
      requestId,
      error,
    });
    return errorResponse(
      requestId,
      500,
      "INTERNAL_ERROR",
      "Failed to evaluate consent",
    );
  }
}

function resolveRequestId(request: Request): string {
  const supplied = request.headers.get("x-request-id")?.trim();
  return supplied && /^[A-Za-z0-9._-]{1,100}$/.test(supplied)
    ? supplied
    : randomUUID();
}

function errorResponse(
  requestId: string,
  status: number,
  code: string,
  message: string,
  retryAfterSeconds?: number,
): NextResponse {
  return NextResponse.json(
    { success: false, requestId, error: { code, message } },
    {
      status,
      headers: {
        ...RESPONSE_HEADERS,
        "X-Request-Id": requestId,
        ...(retryAfterSeconds
          ? { "Retry-After": String(retryAfterSeconds) }
          : {}),
      },
    },
  );
}
