import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { authenticateApiKey } from "@/lib/api-key-auth";
import {
  createSubjectSession,
  isValidSubjectKey,
  upsertConsentSubject,
} from "@/lib/consent/subject-session";
import { emailDomainHint, normalizeEmail } from "@/lib/consent/revocation-notification-core";
import { logger } from "@/lib/logger";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit-store";
import { isValidWebsiteId, readPublicJsonObject } from "@/lib/sdk/public-http";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

/**
 * Establish a website-isolated signed-in subject and mint a short-lived
 * subjectSessionToken for the browser SDK.
 *
 * Authenticated with API key scope `consent:subject`.
 * Body: { websiteId, subjectKey, email? }
 * Email is optional notification metadata — never the ownership key.
 *
 * Customer integration:
 *   After login → POST this endpoint from your backend → pass token to CMP.setSubjectSession
 *   On logout  → POST /api/v1/consent/subject/logout → CMP.clearSubjectSession()
 */
export async function POST(request: Request) {
  const requestId = resolveRequestId(request);
  try {
    const ip = getClientIp(request);
    const unauthenticatedLimit = await consumeRateLimit({
      key: `consent-subject-ip:${ip}`,
      limit: 60,
      windowMs: 60_000,
    });
    if (!unauthenticatedLimit.allowed) {
      return errorResponse(requestId, 429, "RATE_LIMITED", "Too many requests");
    }

    const authentication = await authenticateApiKey(request, "consent:subject");
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
        authentication.reason === "missing" ? "AUTHENTICATION_REQUIRED" : "INVALID_API_KEY",
        "A valid bearer API key is required",
      );
    }

    const keyLimit = await consumeRateLimit({
      key: `consent-subject-key:${authentication.context.apiKeyId}:${ip}`,
      limit: 300,
      windowMs: 60_000,
    });
    if (!keyLimit.allowed) {
      return errorResponse(requestId, 429, "RATE_LIMITED", "Too many requests");
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

    const websiteId = String(json.body.websiteId ?? "").trim();
    const subjectKey = String(json.body.subjectKey ?? "").trim();
    const rawEmail = json.body.email;
    const email =
      rawEmail === undefined || rawEmail === null || String(rawEmail).trim() === ""
        ? null
        : normalizeEmail(rawEmail);

    if (!websiteId || !isValidWebsiteId(websiteId)) {
      return errorResponse(requestId, 400, "INVALID_WEBSITE_ID", "websiteId is required");
    }
    if (!subjectKey || !isValidSubjectKey(subjectKey)) {
      return errorResponse(
        requestId,
        400,
        "INVALID_SUBJECT_KEY",
        "subjectKey is required (3-255 chars, stable user id from your auth)",
      );
    }
    if (rawEmail !== undefined && rawEmail !== null && String(rawEmail).trim() !== "" && !email) {
      return errorResponse(requestId, 400, "INVALID_EMAIL", "email must be a valid address when provided");
    }

    const [website] = await db
      .select({
        id: websites.id,
        organizationId: websites.organizationId,
      })
      .from(websites)
      .where(
        and(
          eq(websites.id, websiteId),
          eq(websites.organizationId, authentication.context.organizationId),
        ),
      )
      .limit(1);

    if (!website) {
      return errorResponse(requestId, 404, "WEBSITE_NOT_FOUND", "Website not found for this API key");
    }

    const subject = await upsertConsentSubject({
      organizationId: website.organizationId,
      websiteId: website.id,
      subjectKey,
      authSource: "api_key",
      email,
    });

    const session = await createSubjectSession({
      organizationId: website.organizationId,
      websiteId: website.id,
      subjectId: subject.id,
    });

    logger.info("Consent subject session established via API key", {
      operation: "consent.subject.establish",
      requestId,
      websiteId: website.id,
      subjectKey,
      recipientHint: email ? emailDomainHint(email) : null,
    });

    return NextResponse.json(
      {
        success: true,
        requestId,
        websiteId: website.id,
        subjectKey,
        subjectSessionToken: session.token,
        expiresAt: session.expiresAt.toISOString(),
        emailBound: Boolean(subject.email),
      },
      { headers: RESPONSE_HEADERS },
    );
  } catch (error) {
    logger.error("Consent subject establish failed", {
      operation: "consent.subject.establish",
      requestId,
      error,
    });
    return errorResponse(requestId, 500, "INTERNAL_ERROR", "Failed to establish subject session");
  }
}

function resolveRequestId(request: Request): string {
  const header = request.headers.get("x-request-id")?.trim();
  return header || randomUUID();
}

function errorResponse(
  requestId: string,
  status: number,
  code: string,
  message: string,
) {
  return NextResponse.json(
    { success: false, requestId, code, message },
    { status, headers: RESPONSE_HEADERS },
  );
}
