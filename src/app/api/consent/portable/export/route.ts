import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { consentRecords } from "@/db/schema/consent-records";
import { consentDecisions } from "@/db/schema/consent-decisions";
import { purposes } from "@/db/schema/purposes";
import { vendors } from "@/db/schema/vendors";
import { publicCorsHeaders, publicOptionsResponse, isValidConsentId, isValidWebsiteId } from "@/lib/sdk/public-http";
import { createPortableConsentCryptoProof, type PortableConsentClaims } from "@/lib/portable-consent-proof";

const CORS_HEADERS = publicCorsHeaders("GET, OPTIONS");

// GET /api/consent/portable/export?consentId=<cid>&websiteId=<id>
//
// Public endpoint used by SDKs to export a visitor's consent as a portable,
// integrity-checked bundle that can be imported on a different website.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const consentId = searchParams.get("consentId")?.trim() ?? "";
    const websiteId = searchParams.get("websiteId")?.trim() ?? "";

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
      })
      .from(consentRecords)
      .where(and(eq(consentRecords.consentId, consentId), eq(consentRecords.websiteId, websiteId)))
      .limit(1);

    if (!record) {
      return NextResponse.json(
        { success: false, message: "Consent record not found" },
        { status: 404, headers: CORS_HEADERS },
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

    const claims: PortableConsentClaims = {
      v: 1,
      consentId: record.consentId,
      originWebsiteId: record.websiteId,
      status: record.status,
      jurisdiction: record.jurisdiction,
      consentedAt,
      expiresAt,
      choice,
      decisions,
    };

    const proof = createPortableConsentCryptoProof(claims);

    return NextResponse.json(
      {
        success: true,
        claims,
        proof,
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

// CORS preflight.
export async function OPTIONS() {
  return publicOptionsResponse("GET, OPTIONS");
}

