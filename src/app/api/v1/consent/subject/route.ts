import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { consentRecords } from "@/db/schema/consent-records";
import { websites } from "@/db/schema/websites";
import { authenticateApiKey } from "@/lib/api-key-auth";
import {
  emailDomainHint,
  normalizeEmail,
  withSubjectIdentity,
} from "@/lib/consent/revocation-notification-core";
import { logger } from "@/lib/logger";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit-store";
import { isValidConsentId, isValidWebsiteId, readPublicJsonObject } from "@/lib/sdk/public-http";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

/**
 * Trusted website integration: bind a verified end-user email to a consent record.
 * Authenticated with API key scope `consent:subject`. Never accept this from the browser SDK.
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
    const consentId = String(json.body.consentId ?? "").trim();
    const email = normalizeEmail(json.body.email);

    if (!websiteId || !isValidWebsiteId(websiteId)) {
      return errorResponse(requestId, 400, "INVALID_WEBSITE_ID", "websiteId is required");
    }
    if (!consentId || !isValidConsentId(consentId)) {
      return errorResponse(requestId, 400, "INVALID_CONSENT_ID", "consentId is required");
    }
    if (!email) {
      return errorResponse(requestId, 400, "INVALID_EMAIL", "A valid email is required");
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

    const [record] = await db
      .select({
        id: consentRecords.id,
        metadata: consentRecords.metadata,
        organizationId: consentRecords.organizationId,
        websiteId: consentRecords.websiteId,
      })
      .from(consentRecords)
      .where(
        and(
          eq(consentRecords.consentId, consentId),
          eq(consentRecords.websiteId, website.id),
          eq(consentRecords.organizationId, website.organizationId),
        ),
      )
      .limit(1);

    if (!record) {
      return errorResponse(requestId, 404, "CONSENT_NOT_FOUND", "Consent record not found");
    }

    const previous =
      record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
        ? (record.metadata as Record<string, unknown>)
        : {};
    const nextMetadata = withSubjectIdentity(previous, {
      email,
      verifiedAt: new Date().toISOString(),
      source: "api_key",
    });

    await db
      .update(consentRecords)
      .set({ metadata: nextMetadata, updatedAt: new Date() })
      .where(
        and(
          eq(consentRecords.id, record.id),
          eq(consentRecords.organizationId, website.organizationId),
          eq(consentRecords.websiteId, website.id),
        ),
      );

    logger.info("Consent subject email bound via API key", {
      operation: "consent.subject.bind",
      requestId,
      consentRecordId: record.id,
      websiteId: website.id,
      recipientHint: emailDomainHint(email),
    });

    return NextResponse.json(
      {
        success: true,
        requestId,
        consentId,
        websiteId: website.id,
        bound: true,
      },
      { headers: RESPONSE_HEADERS },
    );
  } catch (error) {
    logger.error("Consent subject bind failed", {
      operation: "consent.subject.bind",
      requestId,
      error,
    });
    return errorResponse(requestId, 500, "INTERNAL_ERROR", "Failed to bind subject email");
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
