import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { websites } from "@/db/schema/websites";
import {
  loadAccountConsentSnapshot,
  saveAccountConsent,
  type AccountDecisionInput,
} from "@/lib/consent/account-consent";
import { notifyAccountPreferenceChanges } from "@/lib/consent/revocation-notification";
import {
  readSubjectSessionToken,
  resolveSubjectSession,
} from "@/lib/consent/subject-session";
import { logger } from "@/lib/logger";
import { enqueuePreferenceSync } from "@/lib/webhooks/preference-sync-delivery";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit-store";
import {
  isValidWebsiteId,
  publicCorsHeaders,
  publicOptionsResponse,
  readPublicJsonObject,
} from "@/lib/sdk/public-http";
import { sdkOriginGuard } from "@/lib/sdk/origin-allowlist";

const CORS_HEADERS = publicCorsHeaders("GET, POST, OPTIONS");

export function OPTIONS() {
  return publicOptionsResponse("GET, POST, OPTIONS");
}

/**
 * Account-owned consent for a verified subject session.
 * Auth: X-CMP-Subject-Session or Authorization: Bearer css_...
 * Guest consentId APIs remain unchanged for anonymous/static sites.
 */
export async function GET(request: Request) {
  try {
    const token = readSubjectSessionToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, code: "SUBJECT_SESSION_REQUIRED", message: "Subject session required" },
        { status: 401, headers: CORS_HEADERS },
      );
    }

    const limit = await consumeRateLimit({
      key: `consent-account-get:${getClientIp(request)}`,
      limit: 120,
      windowMs: 60_000,
    });
    if (!limit.allowed) return rateLimitResponse(limit, CORS_HEADERS);

    const session = await resolveSubjectSession(token);
    if (!session) {
      return NextResponse.json(
        { success: false, code: "SUBJECT_SESSION_INVALID", message: "Subject session expired or revoked" },
        { status: 401, headers: CORS_HEADERS },
      );
    }

    const [website] = await db
      .select({
        id: websites.id,
        siteKey: websites.siteKey,
        organizationId: websites.organizationId,
        status: websites.status,
        domain: websites.domain,
        verified: websites.verified,
      })
      .from(websites)
      .where(eq(websites.id, session.subject.websiteId))
      .limit(1);

    if (!website || website.status !== "active") {
      return NextResponse.json(
        { success: false, message: "Website not found" },
        { status: 404, headers: CORS_HEADERS },
      );
    }
    const originError = sdkOriginGuard(request, website, CORS_HEADERS);
    if (originError) return originError;

    const snapshot = await loadAccountConsentSnapshot(session.subject);
    return NextResponse.json(
      {
        success: true,
        confirmed: snapshot.exists && snapshot.status === "active",
        account: snapshot,
        subjectKey: session.subject.subjectKey,
        websiteId: session.subject.websiteId,
        expiresAt: session.expiresAt.toISOString(),
      },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    logger.error("Account consent GET failed", { operation: "consent.account.get", error });
    return NextResponse.json(
      { success: false, message: "Failed to load account consent" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

export async function POST(request: Request) {
  try {
    const token = readSubjectSessionToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, code: "SUBJECT_SESSION_REQUIRED", message: "Subject session required" },
        { status: 401, headers: CORS_HEADERS },
      );
    }

    const limit = await consumeRateLimit({
      key: `consent-account-post:${getClientIp(request)}`,
      limit: 60,
      windowMs: 60_000,
    });
    if (!limit.allowed) return rateLimitResponse(limit, CORS_HEADERS);

    const session = await resolveSubjectSession(token);
    if (!session) {
      return NextResponse.json(
        { success: false, code: "SUBJECT_SESSION_INVALID", message: "Subject session expired or revoked" },
        { status: 401, headers: CORS_HEADERS },
      );
    }

    const parsed = await readPublicJsonObject(request);
    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, message: parsed.message },
        { status: parsed.status, headers: CORS_HEADERS },
      );
    }

    const websiteId = String(parsed.body.websiteId ?? "").trim();
    if (websiteId && isValidWebsiteId(websiteId) && websiteId !== session.subject.websiteId) {
      return NextResponse.json(
        { success: false, code: "WEBSITE_MISMATCH", message: "websiteId does not match subject session" },
        { status: 403, headers: CORS_HEADERS },
      );
    }

    const [website] = await db
      .select({
        id: websites.id,
        siteKey: websites.siteKey,
        organizationId: websites.organizationId,
        status: websites.status,
        domain: websites.domain,
        verified: websites.verified,
      })
      .from(websites)
      .where(eq(websites.id, session.subject.websiteId))
      .limit(1);

    if (!website || website.status !== "active") {
      return NextResponse.json(
        { success: false, message: "Website not found" },
        { status: 404, headers: CORS_HEADERS },
      );
    }
    const originError = sdkOriginGuard(request, website, CORS_HEADERS);
    if (originError) return originError;

    const expectedStateVersion = Number(parsed.body.expectedStateVersion ?? 0);
    if (!Number.isInteger(expectedStateVersion) || expectedStateVersion < 0) {
      return NextResponse.json(
        { success: false, message: "expectedStateVersion must be a non-negative integer" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const fullWithdrawal = parsed.body.fullWithdrawal === true;
    const choice = String(parsed.body.choice ?? "").trim() || undefined;
    const policyVersionId = String(parsed.body.policyVersionId ?? "").trim();
    if (!policyVersionId) {
      return NextResponse.json(
        { success: false, message: "policyVersionId is required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const [policyVersion] = await db
      .select({ id: consentPolicyVersions.id })
      .from(consentPolicyVersions)
      .innerJoin(consentPolicies, eq(consentPolicies.id, consentPolicyVersions.policyId))
      .where(
        and(
          eq(consentPolicyVersions.id, policyVersionId),
          eq(consentPolicies.websiteId, session.subject.websiteId),
        ),
      )
      .limit(1);

    if (!policyVersion) {
      return NextResponse.json(
        { success: false, message: "policyVersionId is invalid for this website" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const purposeDecisions = Array.isArray(parsed.body.purposeDecisions)
      ? parsed.body.purposeDecisions
      : [];
    const vendorDecisions = Array.isArray(parsed.body.vendorDecisions)
      ? parsed.body.vendorDecisions
      : [];

    const decisions: AccountDecisionInput[] = [];
    for (const row of purposeDecisions) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const purposeId = String((row as Record<string, unknown>).purposeId ?? "").trim();
      if (!purposeId) continue;
      decisions.push({
        purposeId,
        vendorId: null,
        granted: Boolean((row as Record<string, unknown>).granted),
      });
    }
    for (const row of vendorDecisions) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const vendorId = String((row as Record<string, unknown>).vendorId ?? "").trim();
      if (!vendorId) continue;
      decisions.push({
        purposeId: null,
        vendorId,
        granted: Boolean((row as Record<string, unknown>).granted),
      });
    }

    const previousSnapshot = await loadAccountConsentSnapshot(session.subject);
    const saved = await saveAccountConsent({
      subject: session.subject,
      policyVersionId,
      decisions,
      expectedStateVersion,
      choice,
      fullWithdrawal,
    });

    if (!saved.ok) {
      return NextResponse.json(
        {
          success: false,
          code: saved.code === "STATE_CONFLICT" ? "CONSENT_STATE_CONFLICT" : "INVALID_REQUEST",
          message: saved.message,
          stateVersion: saved.stateVersion ?? null,
        },
        { status: saved.code === "STATE_CONFLICT" ? 409 : 400, headers: CORS_HEADERS },
      );
    }

    if (saved.snapshot.recordId) {
      const previousDecisions = previousSnapshot.decisions.map((row) => ({
        purposeId: row.purposeId,
        vendorId: row.vendorId,
        granted: row.granted,
      }));
      const nextDecisions = saved.snapshot.decisions.map((row) => ({
        purposeId: row.purposeId,
        vendorId: row.vendorId,
        granted: row.granted,
      }));

      // Confirmation email and preference sync are sibling side effects — never nest sync inside mail.
      void notifyAccountPreferenceChanges({
        organizationId: session.subject.organizationId,
        websiteId: session.subject.websiteId,
        accountConsentRecordId: saved.snapshot.recordId,
        subjectKey: session.subject.subjectKey,
        subjectEmail: session.subject.email,
        stateVersion: saved.snapshot.stateVersion,
        previous: previousDecisions,
        next: nextDecisions,
        fullWithdrawal,
      }).catch(() => null);

      void enqueuePreferenceSync({
        organizationId: session.subject.organizationId,
        websiteId: session.subject.websiteId,
        subjectKey: session.subject.subjectKey,
        preferenceRevision: saved.snapshot.stateVersion,
        previous: previousDecisions,
        next: nextDecisions,
        fullWithdrawal,
        hadPreviousRecord: previousSnapshot.exists,
      }).catch(() => null);
    }

    return NextResponse.json(
      {
        success: true,
        confirmed: true,
        ownership: "account",
        account: saved.snapshot,
        subjectKey: session.subject.subjectKey,
        websiteId: session.subject.websiteId,
        stateVersion: saved.snapshot.stateVersion,
        decisions: saved.snapshot.decisions,
      },
      { status: saved.snapshot.stateVersion === 1 && expectedStateVersion === 0 ? 201 : 200, headers: CORS_HEADERS },
    );
  } catch (error) {
    logger.error("Account consent POST failed", { operation: "consent.account.post", error });
    return NextResponse.json(
      { success: false, message: "Failed to save account consent" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
