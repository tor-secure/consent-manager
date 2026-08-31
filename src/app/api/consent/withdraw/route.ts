import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { consentRecords } from "@/db/schema/consent-records";
import { appendConsentEvent } from "@/lib/consent-engine";
import {
  isValidConsentId,
  isValidWebsiteId,
  publicCorsHeaders,
  publicOptionsResponse,
  readPublicJsonObject,
} from "@/lib/sdk/public-http";

const CORS_HEADERS = publicCorsHeaders("POST, OPTIONS");

// POST /api/consent/withdraw
// Body: { consentId: string; websiteId: string }
// Withdraws a consent record. Public — called from external websites.
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

    // Verify website exists.
    const [website] = await db
      .select({ id: websites.id })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);

    if (!website) {
      return NextResponse.json(
        { success: false, message: "Website not found" },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    // Load and verify the consent record belongs to this website.
    const [record] = await db
      .select({
        id: consentRecords.id,
        status: consentRecords.status,
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

    const now = new Date();

    await db
      .update(consentRecords)
      .set({
        status: "withdrawn",
        withdrawnAt: now,
        updatedAt: now,
      })
      .where(eq(consentRecords.id, record.id));

    // Append withdrawal event — best-effort; must not fail the response
    // since the withdrawal is already committed to the DB.
    try {
      await appendConsentEvent({
        consentRecordId: record.id,
        policyVersionId: record.policyVersionId,
        eventType: "consent.withdrawn",
        eventData: {
          previousStatus: record.status,
          withdrawnAt: now.toISOString(),
        },
      });
    } catch (eventError) {
      console.error("appendConsentEvent (withdrawal) failed (non-fatal):", eventError);
    }

    return NextResponse.json(
      { success: true, withdrawnAt: now },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error("Consent withdrawal failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to withdraw consent" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

// CORS preflight.
export async function OPTIONS() {
  return publicOptionsResponse("POST, OPTIONS");
}
