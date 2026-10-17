import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { consentRecords } from "@/db/schema/consent-records";
import { withdrawConsentRecord } from "@/lib/consent-withdraw";
import { logger } from "@/lib/logger";
import {
  isValidConsentId,
  isValidWebsiteId,
  publicCorsHeaders,
  publicOptionsResponse,
  readPublicJsonObject,
} from "@/lib/sdk/public-http";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit-store";
import { sdkOriginGuard } from "@/lib/sdk/origin-allowlist";

const CORS_HEADERS = publicCorsHeaders("POST, OPTIONS");

export async function POST(request: Request) {
  try {
    const parsed = await readPublicJsonObject(request);
    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, message: parsed.message },
        { status: parsed.status, headers: CORS_HEADERS },
      );
    }
    const body = parsed.body;

    const consentId = String(body.consentId ?? "").trim();
    const websiteId = String(body.websiteId ?? "").trim();

    if (!consentId || !websiteId) {
      return NextResponse.json(
        { success: false, message: "consentId and websiteId are required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    if (!isValidConsentId(consentId) || !isValidWebsiteId(websiteId)) {
      return NextResponse.json(
        { success: false, message: "Invalid parameter format" },
        { status: 400, headers: CORS_HEADERS },
      );
    }
    const expectedStateVersion = Number(body.expectedStateVersion);
    if (!Number.isInteger(expectedStateVersion) || expectedStateVersion < 1) {
      return NextResponse.json(
        { success: false, message: "Invalid expectedStateVersion" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const limit = await consumeRateLimit({
      key: `consent-withdraw:${websiteId}:${getClientIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!limit.allowed) return rateLimitResponse(limit, CORS_HEADERS);

    const [website] = await db
      .select({
        id: websites.id,
        organizationId: websites.organizationId,
        domain: websites.domain,
        verified: websites.verified,
        siteKey: websites.siteKey,
      })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);

    if (!website) {
      return NextResponse.json(
        { success: false, message: "Website not found" },
        { status: 404, headers: CORS_HEADERS },
      );
    }
    const siteKey = String(body.siteKey ?? "").trim();
    if (!siteKey || siteKey !== website.siteKey) {
      return NextResponse.json(
        { success: false, message: "siteKey is required" },
        { status: 403, headers: CORS_HEADERS },
      );
    }
    const originError = sdkOriginGuard(request, website, CORS_HEADERS);
    if (originError) return originError;

    const [record] = await db
      .select({
        id: consentRecords.id,
        organizationId: consentRecords.organizationId,
        consentId: consentRecords.consentId,
        status: consentRecords.status,
        stateVersion: consentRecords.stateVersion,
        policyVersionId: consentRecords.policyVersionId,
      })
      .from(consentRecords)
      .where(
        and(
          eq(consentRecords.consentId, consentId),
          eq(consentRecords.websiteId, website.id),
        ),
      )
      .limit(1);

    if (!record) {
      return NextResponse.json(
        { success: false, message: "Consent record not found" },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    if (record.status === "withdrawn") {
      return NextResponse.json(
        { success: false, message: "Consent has already been withdrawn" },
        { status: 409, headers: CORS_HEADERS },
      );
    }
    if (record.stateVersion !== expectedStateVersion) {
      return NextResponse.json(
        {
          success: false,
          code: "CONSENT_STATE_CONFLICT",
          message: "Consent state changed; refresh and retry",
        },
        { status: 409, headers: CORS_HEADERS },
      );
    }

    const result = await withdrawConsentRecord({
      record: { ...record, organizationId: website.organizationId },
      expectedStateVersion,
      source: "web",
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          code: "CONSENT_STATE_CONFLICT",
          message: "Consent state changed; refresh and retry",
        },
        { status: 409, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json(
      { success: true, withdrawnAt: result.withdrawnAt, stateVersion: result.stateVersion },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    logger.error("Consent withdrawal failed", {
      operation: "consent.withdraw",
      error,
    });
    return NextResponse.json(
      { success: false, message: "Failed to withdraw consent" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

export async function OPTIONS() {
  return publicOptionsResponse("POST, OPTIONS");
}
