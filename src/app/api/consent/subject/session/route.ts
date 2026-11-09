import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { bindSubjectFromClerkSession } from "@/lib/consent/bind-subject-from-session";
import { logger } from "@/lib/logger";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit-store";
import {
  isValidConsentId,
  isValidWebsiteId,
  readPublicJsonObject,
} from "@/lib/sdk/public-http";

/**
 * After the visitor logs into Consent Guru (Clerk), bind their verified
 * primary email to the consentId they hold in the browser.
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, message: "Sign in required" }, { status: 401 });
    }

    const limit = await consumeRateLimit({
      key: `consent-subject-session:${userId}:${getClientIp(request)}`,
      limit: 60,
      windowMs: 60_000,
    });
    if (!limit.allowed) {
      return NextResponse.json({ success: false, message: "Too many requests" }, { status: 429 });
    }

    const parsed = await readPublicJsonObject(request);
    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, message: parsed.message },
        { status: parsed.status },
      );
    }

    const websiteId = String(parsed.body.websiteId ?? "").trim();
    const consentId = String(parsed.body.consentId ?? "").trim();
    const siteKey = String(parsed.body.siteKey ?? "").trim();

    if (!websiteId || !isValidWebsiteId(websiteId)) {
      return NextResponse.json({ success: false, message: "Invalid websiteId" }, { status: 400 });
    }
    if (!consentId || !isValidConsentId(consentId)) {
      return NextResponse.json({ success: false, message: "Invalid consentId" }, { status: 400 });
    }
    if (!siteKey) {
      return NextResponse.json({ success: false, message: "siteKey is required" }, { status: 400 });
    }

    const [website] = await db
      .select({
        id: websites.id,
        organizationId: websites.organizationId,
        siteKey: websites.siteKey,
      })
      .from(websites)
      .where(and(eq(websites.id, websiteId), eq(websites.siteKey, siteKey)))
      .limit(1);

    if (!website) {
      return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
    }

    const result = await bindSubjectFromClerkSession({
      organizationId: website.organizationId,
      websiteId: website.id,
      consentId,
    });

    return NextResponse.json({
      success: true,
      bound: result.bound,
      reason: result.reason ?? null,
    });
  } catch (error) {
    logger.error("Consent subject session bind failed", {
      operation: "consent.subject.session",
      error,
    });
    return NextResponse.json(
      { success: false, message: "Failed to bind consent subject" },
      { status: 500 },
    );
  }
}
