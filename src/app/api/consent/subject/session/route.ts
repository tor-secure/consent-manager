import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import {
  createSubjectSession,
  upsertConsentSubject,
} from "@/lib/consent/subject-session";
import { normalizeEmail } from "@/lib/consent/revocation-notification-core";
import { logger } from "@/lib/logger";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit-store";
import { isValidWebsiteId, readPublicJsonObject } from "@/lib/sdk/public-http";

/**
 * Consent Guru first-party: after Clerk login, mint a subject session for
 * subjectKey = Clerk userId. Email is optional notification metadata.
 * Does NOT convert guest consentId records into account ownership.
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
    const siteKey = String(parsed.body.siteKey ?? "").trim();

    if (!websiteId || !isValidWebsiteId(websiteId)) {
      return NextResponse.json({ success: false, message: "Invalid websiteId" }, { status: 400 });
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

    const clerkUser = await currentUser();
    const primary = clerkUser?.emailAddresses.find(
      (row) => row.id === clerkUser.primaryEmailAddressId,
    );
    const email =
      primary && primary.verification?.status === "verified"
        ? normalizeEmail(primary.emailAddress)
        : null;

    const subject = await upsertConsentSubject({
      organizationId: website.organizationId,
      websiteId: website.id,
      subjectKey: userId,
      authSource: "clerk",
      email,
    });

    const session = await createSubjectSession({
      organizationId: website.organizationId,
      websiteId: website.id,
      subjectId: subject.id,
    });

    logger.info("Consent subject session minted from Clerk", {
      operation: "consent.subject.clerk_session",
      websiteId: website.id,
      hasEmail: Boolean(email),
    });

    return NextResponse.json({
      success: true,
      subjectKey: userId,
      websiteId: website.id,
      subjectSessionToken: session.token,
      expiresAt: session.expiresAt.toISOString(),
      emailBound: Boolean(email),
    });
  } catch (error) {
    logger.error("Consent subject session mint failed", {
      operation: "consent.subject.clerk_session",
      error,
    });
    return NextResponse.json(
      { success: false, message: "Failed to establish subject session" },
      { status: 500 },
    );
  }
}
