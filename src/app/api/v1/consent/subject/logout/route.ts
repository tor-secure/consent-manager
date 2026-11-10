import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { consentSubjects } from "@/db/schema/consent-subjects";
import { websites } from "@/db/schema/websites";
import { authenticateApiKey } from "@/lib/api-key-auth";
import {
  isValidSubjectKey,
  revokeSubjectSessionToken,
  revokeSubjectSessionsForSubject,
} from "@/lib/consent/subject-session";
import { logger } from "@/lib/logger";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit-store";
import { isValidWebsiteId, readPublicJsonObject } from "@/lib/sdk/public-http";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

/**
 * Revoke a subject session after customer-site logout or account switch.
 * Body may include subjectSessionToken and/or { websiteId, subjectKey }.
 */
export async function POST(request: Request) {
  const requestId = resolveRequestId(request);
  try {
    const ip = getClientIp(request);
    const authentication = await authenticateApiKey(request, "consent:subject");
    if (!authentication.ok) {
      return NextResponse.json(
        {
          success: false,
          requestId,
          code: authentication.reason === "missing" ? "AUTHENTICATION_REQUIRED" : "INVALID_API_KEY",
          message: "A valid bearer API key is required",
        },
        { status: 401, headers: RESPONSE_HEADERS },
      );
    }

    const limit = await consumeRateLimit({
      key: `consent-subject-logout:${authentication.context.apiKeyId}:${ip}`,
      limit: 300,
      windowMs: 60_000,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, requestId, code: "RATE_LIMITED", message: "Too many requests" },
        { status: 429, headers: RESPONSE_HEADERS },
      );
    }

    const json = await readPublicJsonObject(request);
    if (!json.ok) {
      return NextResponse.json(
        { success: false, requestId, code: "INVALID_REQUEST", message: json.message },
        { status: json.status, headers: RESPONSE_HEADERS },
      );
    }

    const token = String(json.body.subjectSessionToken ?? "").trim();
    const websiteId = String(json.body.websiteId ?? "").trim();
    const subjectKey = String(json.body.subjectKey ?? "").trim();

    let revoked = 0;
    if (token) {
      revoked += (await revokeSubjectSessionToken(token)) ? 1 : 0;
    }

    if (websiteId && subjectKey && isValidWebsiteId(websiteId) && isValidSubjectKey(subjectKey)) {
      const [website] = await db
        .select({ id: websites.id, organizationId: websites.organizationId })
        .from(websites)
        .where(
          and(
            eq(websites.id, websiteId),
            eq(websites.organizationId, authentication.context.organizationId),
          ),
        )
        .limit(1);

      if (website) {
        const [subject] = await db
          .select({ id: consentSubjects.id })
          .from(consentSubjects)
          .where(
            and(
              eq(consentSubjects.websiteId, website.id),
              eq(consentSubjects.organizationId, website.organizationId),
              eq(consentSubjects.subjectKey, subjectKey),
            ),
          )
          .limit(1);
        if (subject) {
          revoked += await revokeSubjectSessionsForSubject({
            organizationId: website.organizationId,
            websiteId: website.id,
            subjectId: subject.id,
          });
        }
      }
    }

    logger.info("Consent subject session logout", {
      operation: "consent.subject.logout",
      requestId,
      revoked,
    });

    return NextResponse.json(
      { success: true, requestId, revoked },
      { headers: RESPONSE_HEADERS },
    );
  } catch (error) {
    logger.error("Consent subject logout failed", {
      operation: "consent.subject.logout",
      requestId,
      error,
    });
    return NextResponse.json(
      { success: false, requestId, code: "INTERNAL_ERROR", message: "Failed to logout subject" },
      { status: 500, headers: RESPONSE_HEADERS },
    );
  }
}

function resolveRequestId(request: Request): string {
  return request.headers.get("x-request-id")?.trim() || randomUUID();
}
