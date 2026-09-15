import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { consentRecords } from "@/db/schema/consent-records";
import { consentDecisions } from "@/db/schema/consent-decisions";
import { purposes } from "@/db/schema/purposes";
import { vendors } from "@/db/schema/vendors";
import { portableConsentExchanges } from "@/db/schema/portable-consent-exchanges";
import { websites } from "@/db/schema/websites";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import { resolveConsentState } from "@/lib/consent-evaluation-core";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { publicCorsHeaders, publicOptionsResponse, isValidConsentId, isValidWebsiteId } from "@/lib/sdk/public-http";
import {
  createPortableConsentCryptoProof,
  createPortableExchangeCode,
  hashPortableExchangeSecret,
  PORTABLE_EXCHANGE_TTL_MS,
  type PortableConsentClaims,
} from "@/lib/portable-consent-proof";

const CORS_HEADERS = { ...publicCorsHeaders("GET, OPTIONS"), "Cache-Control": "no-store" };

// GET /api/consent/portable/export?consentId=<cid>&websiteId=<id>
//
// Public endpoint used by SDKs to export a visitor's consent as a portable,
// integrity-checked bundle that can be imported on a different website.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const consentId = searchParams.get("consentId")?.trim() ?? "";
    const websiteId = searchParams.get("websiteId")?.trim() ?? "";
    const targetWebsiteId = searchParams.get("targetWebsiteId")?.trim() ?? "";

    if (!consentId || !websiteId || !targetWebsiteId) {
      return NextResponse.json(
        { success: false, message: "consentId, websiteId, and targetWebsiteId are required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    if (!isValidConsentId(consentId) || !isValidWebsiteId(websiteId) || !isValidWebsiteId(targetWebsiteId)) {
      return NextResponse.json(
        { success: false, message: "Invalid parameter format" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const limit = rateLimit({
      key: `portable-export:${websiteId}:${getClientIp(request)}`,
      limit: 20,
      windowMs: 60_000,
    });
    if (!limit.allowed) return rateLimitResponse(limit, CORS_HEADERS);

    const [record] = await db
      .select({
        id: consentRecords.id,
        consentId: consentRecords.consentId,
        websiteId: consentRecords.websiteId,
        status: consentRecords.status,
        jurisdiction: consentRecords.jurisdiction,
        consentedAt: consentRecords.consentedAt,
        expiresAt: consentRecords.expiresAt,
        createdAt: consentRecords.createdAt,
        metadata: consentRecords.metadata,
        withdrawnAt: consentRecords.withdrawnAt,
        organizationId: consentRecords.organizationId,
        sourceDomain: websites.domain,
      })
      .from(consentRecords)
      .innerJoin(websites, eq(consentRecords.websiteId, websites.id))
      .where(and(eq(consentRecords.consentId, consentId), eq(consentRecords.websiteId, websiteId)))
      .limit(1);

    if (!record) {
      return NextResponse.json(
        { success: false, message: "Consent record not found" },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    const [target] = await db
      .select({ id: websites.id })
      .from(websites)
      .where(and(
        eq(websites.id, targetWebsiteId),
        eq(websites.organizationId, record.organizationId),
        eq(websites.status, "active"),
        isNull(websites.deletedAt),
      ))
      .limit(1);
    if (!target) {
      return NextResponse.json(
        { success: false, message: "Target website is not in the source organization" },
        { status: 403, headers: CORS_HEADERS },
      );
    }

    if (!(await callerMayExport(request, record.organizationId))) {
      return NextResponse.json(
        { success: false, message: "Origin is not authorized for this website" },
        { status: 403, headers: CORS_HEADERS },
      );
    }

    if (resolveConsentState(record) !== "active") {
      return NextResponse.json(
        { success: false, message: "Only active, unexpired consent can be exchanged" },
        { status: 409, headers: CORS_HEADERS },
      );
    }

    const metadata = record.metadata && typeof record.metadata === "object" ? (record.metadata as Record<string, unknown>) : {};
    const choice = typeof metadata.choice === "string" ? metadata.choice : null;

    const consentedAt = record.consentedAt
      ? record.consentedAt.toISOString()
      : record.createdAt.toISOString();
    const expiresAt = record.expiresAt ? record.expiresAt.toISOString() : null;

    const decisionRows = await db
      .select({
        purposeKey: purposes.key,
        vendorDomain: vendors.domain,
        granted: consentDecisions.granted,
      })
      .from(consentDecisions)
      .leftJoin(purposes, eq(consentDecisions.purposeId, purposes.id))
      .leftJoin(vendors, eq(consentDecisions.vendorId, vendors.id))
      .where(eq(consentDecisions.consentRecordId, record.id));

    const decisions = decisionRows
      .map((row) => ({
        purposeKey: row.purposeKey ?? null,
        vendorDomain: row.vendorDomain ?? null,
        granted: row.granted,
      }))
      .filter((d) => d.purposeKey !== null || d.vendorDomain !== null);

    const issuedAt = new Date();
    const exchangeExpiresAt = new Date(issuedAt.getTime() + PORTABLE_EXCHANGE_TTL_MS);
    const claims: PortableConsentClaims = {
      v: 2,
      jti: randomUUID(),
      consentId: record.consentId,
      originWebsiteId: record.websiteId,
      targetWebsiteId,
      audience: "portable-consent-import",
      status: record.status,
      jurisdiction: record.jurisdiction,
      consentedAt,
      expiresAt,
      choice,
      decisions,
      issuedAt: issuedAt.toISOString(),
      exchangeExpiresAt: exchangeExpiresAt.toISOString(),
    };

    const proof = createPortableConsentCryptoProof(claims);
    const token = Buffer.from(JSON.stringify({ claims, proof }), "utf8").toString("base64url");
    const code = createPortableExchangeCode();
    await db.insert(portableConsentExchanges).values({
      jti: claims.jti,
      organizationId: record.organizationId,
      sourceWebsiteId: websiteId,
      targetWebsiteId,
      sourceConsentRecordId: record.id,
      tokenHash: hashPortableExchangeSecret(token),
      codeHash: hashPortableExchangeSecret(code),
      claims: { claims, proof },
      issuedAt,
      expiresAt: exchangeExpiresAt,
    });

    return NextResponse.json(
      {
        success: true,
        claims,
        proof,
        token,
        code,
        expiresAt: claims.exchangeExpiresAt,
      },
      { headers: CORS_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to export portable consent" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

async function callerMayExport(request: Request, organizationId: string): Promise<boolean> {
  const session = await auth();
  if (session.isAuthenticated && session.orgId && session.userId) {
    const [organization, user] = await Promise.all([
      resolveLocalOrganization(session.orgId),
      resolveLocalUser(session.userId),
    ]);
    if (organization?.id === organizationId && user &&
        await resolveActiveMembership(organizationId, user.id)) return true;
  }
  return false;
}

// CORS preflight.
export async function OPTIONS() {
  return publicOptionsResponse("GET, OPTIONS");
}

