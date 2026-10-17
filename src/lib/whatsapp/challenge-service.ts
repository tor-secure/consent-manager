import "server-only";

import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { consentDecisions } from "@/db/schema/consent-decisions";
import { consentRecords } from "@/db/schema/consent-records";
import { purposes } from "@/db/schema/purposes";
import { websites } from "@/db/schema/websites";
import { whatsappConsentChallenges } from "@/db/schema/whatsapp-consent-challenges";
import { countryFromRequestHeaders } from "@/lib/analytics/client-hints";
import type { ConsentSubmission } from "@/lib/consent-engine";
import { withdrawConsentRecord } from "@/lib/consent-withdraw";
import { logger } from "@/lib/logger";
import type { PolicyContextClaims, PolicyNoticeSnapshot } from "@/lib/policy-context";
import { regionFromRequestHeaders } from "@/lib/regulations/geo";
import { normalizeSdkConfigDimensions } from "@/lib/sdk/config-cache";
import { loadPublishedSdkConfig } from "@/lib/sdk/load-published-config";
import {
  otpTemplateName,
  sendConsentConfirmationTemplate,
  sendOtpTemplate,
  whatsappConfigured,
} from "./cloud-api";
import { writeWhatsAppConsent, WHATSAPP_CONSENT_SOURCE } from "./consent-writer";
import {
  generateOtp,
  generateSessionToken,
  hashOtp,
  hashSessionToken,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_SENDS,
  OTP_RESEND_DELAY_MS,
  OTP_TTL_MS,
  otpMatches,
  sessionTokenMatches,
} from "./otp";
import { hashPhone, maskPhone, normalizePhoneE164, phoneLast4 } from "./phone";

type Challenge = typeof whatsappConsentChallenges.$inferSelect;

export type ChallengeError = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

export type NoticePurpose = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isRequired: boolean;
  dataCategories: string[];
  retentionPeriod: string | null;
  legalBasis: string | null;
};

export type WhatsAppNotice = {
  websiteName: string;
  policyName: string;
  policyVersion: number;
  title: string;
  description: string;
  locale: string;
  purposes: NoticePurpose[];
  vendors: Array<{ id: string; name: string; domain: string | null }>;
  grievance: Record<string, unknown>;
};

export type WhatsAppConsentSummary = {
  consentId: string;
  status: string;
  stateVersion: number;
  consentedAt: string | null;
  expiresAt: string | null;
  withdrawnAt: string | null;
  websiteName: string;
  phoneMasked: string;
  decisions: Array<{ purposeId: string; name: string; isRequired: boolean; granted: boolean }>;
};

function fail(status: number, code: string, message: string): ChallengeError {
  return { ok: false, status, code, message };
}

function devEchoEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.WHATSAPP_DEV_ECHO_OTP === "1";
}

function stringField(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

function noticeFromSnapshot(snapshot: PolicyNoticeSnapshot, websiteName: string): WhatsAppNotice {
  const banner = snapshot.bannerConfig ?? {};
  return {
    websiteName,
    policyName: snapshot.policy.name,
    policyVersion: snapshot.policy.version,
    title: stringField(banner, "title"),
    description: stringField(banner, "description"),
    locale: snapshot.locale,
    purposes: snapshot.purposes.map((row) => ({
      id: stringField(row, "id"),
      key: stringField(row, "key"),
      name: stringField(row, "name"),
      description: typeof row.description === "string" ? row.description : null,
      isRequired: row.isRequired === true,
      dataCategories: Array.isArray(row.dataCategories)
        ? row.dataCategories.filter((item): item is string => typeof item === "string")
        : [],
      retentionPeriod: typeof row.retentionPeriod === "string" ? row.retentionPeriod : null,
      legalBasis: typeof row.legalBasis === "string" ? row.legalBasis : null,
    })),
    vendors: snapshot.vendors.map((row) => ({
      id: stringField(row, "id"),
      name: stringField(row, "name"),
      domain: typeof row.domain === "string" ? row.domain : null,
    })),
    grievance: snapshot.grievance ?? {},
  };
}

async function websiteBySiteKey(siteKey: string) {
  const [website] = await db
    .select({
      id: websites.id,
      organizationId: websites.organizationId,
      name: websites.name,
      domain: websites.domain,
      siteKey: websites.siteKey,
      status: websites.status,
    })
    .from(websites)
    .where(and(eq(websites.siteKey, siteKey), eq(websites.status, "active")))
    .limit(1);
  return website ?? null;
}

export async function publicWebsiteForSiteKey(siteKey: string) {
  const website = await websiteBySiteKey(siteKey);
  if (!website) return null;
  return { id: website.id, name: website.name, domain: website.domain };
}

async function loadChallenge(challengeId: string): Promise<Challenge | null> {
  const [row] = await db
    .select()
    .from(whatsappConsentChallenges)
    .where(eq(whatsappConsentChallenges.id, challengeId))
    .limit(1);
  return row ?? null;
}

async function sendOtpFor(challenge: { id: string; phoneE164: string }, code: string) {
  if (!whatsappConfigured()) {
    if (devEchoEnabled()) {
      logger.warn("WhatsApp not configured; echoing OTP in development", {
        operation: "whatsapp.otp.dev_echo",
        challengeId: challenge.id,
      });
      return { ok: true as const, messageId: `dev-${challenge.id}` };
    }
    return {
      ok: false as const,
      status: 503,
      code: "not_configured",
      message: "WhatsApp messaging is not configured",
    };
  }
  return sendOtpTemplate({ to: challenge.phoneE164, code });
}

// ---------------------------------------------------------------------------
// Step 2 and 3: mobile number -> OTP sent
// ---------------------------------------------------------------------------

export async function startWhatsAppChallenge(input: {
  siteKey: string;
  phone: string;
  headers: Headers;
}): Promise<
  | {
      ok: true;
      challengeId: string;
      phoneMasked: string;
      otpExpiresAt: string;
      resendAvailableAt: string;
      devOtp?: string;
    }
  | ChallengeError
> {
  const website = await websiteBySiteKey(input.siteKey);
  if (!website) return fail(404, "website_not_found", "Website not found");

  const phoneE164 = normalizePhoneE164(input.phone);
  if (!phoneE164) return fail(400, "invalid_phone", "Enter a valid mobile number");

  const dimensions = normalizeSdkConfigDimensions({
    siteKey: website.siteKey,
    acceptLanguage: input.headers.get("accept-language"),
    country: countryFromRequestHeaders(input.headers),
    region: regionFromRequestHeaders(input.headers),
    gpc: "absent",
  });
  const config = await loadPublishedSdkConfig({
    dimensions,
    gpcHeader: "absent",
    gpcActive: false,
    queryLang: null,
    acceptLanguage: input.headers.get("accept-language"),
  });
  if (!config.ok) {
    return fail(
      409,
      "no_published_policy",
      "This website has no published consent notice yet. Ask the operator to publish a policy.",
    );
  }
  const signed = config.entry.body.policyContext as
    | { claims?: PolicyContextClaims; noticeSnapshot?: PolicyNoticeSnapshot }
    | undefined;
  if (!signed?.claims || !signed.noticeSnapshot) {
    return fail(500, "notice_unavailable", "Could not load the consent notice");
  }
  const claims = signed.claims;
  const snapshot = signed.noticeSnapshot;

  const now = new Date();
  const challengeId = randomUUID();
  const code = generateOtp();
  const [challenge] = await db
    .insert(whatsappConsentChallenges)
    .values({
      id: challengeId,
      organizationId: website.organizationId,
      websiteId: website.id,
      policyId: claims.policyId,
      policyVersionId: claims.policyVersionId,
      policyVersionNumber: claims.policyVersionNumber,
      jurisdiction: claims.jurisdiction,
      locale: claims.locale,
      noticeHash: claims.noticeHash,
      noticeSnapshot: snapshot,
      phoneE164,
      phoneHash: hashPhone(phoneE164),
      phoneLast4: phoneLast4(phoneE164),
      otpHash: hashOtp(challengeId, code),
      status: "otp_sent",
      otpExpiresAt: new Date(now.getTime() + OTP_TTL_MS),
      resendAvailableAt: new Date(now.getTime() + OTP_RESEND_DELAY_MS),
    })
    .returning();

  const sent = await sendOtpFor(challenge, code);
  if (!sent.ok) {
    await db
      .update(whatsappConsentChallenges)
      .set({ status: "failed", otpDeliveryStatus: `send_${sent.code}`, updatedAt: new Date() })
      .where(eq(whatsappConsentChallenges.id, challenge.id));
    return fail(sent.status === 503 ? 503 : 502, "otp_send_failed", sent.message);
  }
  await db
    .update(whatsappConsentChallenges)
    .set({ otpMessageId: sent.messageId, otpDeliveryStatus: "accepted", updatedAt: new Date() })
    .where(eq(whatsappConsentChallenges.id, challenge.id));

  return {
    ok: true,
    challengeId: challenge.id,
    phoneMasked: maskPhone(phoneE164),
    otpExpiresAt: challenge.otpExpiresAt.toISOString(),
    resendAvailableAt: challenge.resendAvailableAt.toISOString(),
    ...(devEchoEnabled() && !whatsappConfigured() ? { devOtp: code } : {}),
  };
}

export async function resendWhatsAppOtp(input: { challengeId: string }): Promise<
  | { ok: true; otpExpiresAt: string; resendAvailableAt: string; devOtp?: string }
  | ChallengeError
> {
  const challenge = await loadChallenge(input.challengeId);
  if (!challenge) return fail(404, "not_found", "This request was not found");
  if (challenge.status !== "otp_sent") {
    return fail(409, "not_resendable", "This request can no longer receive a code");
  }
  const now = new Date();
  if (challenge.resendAvailableAt.getTime() > now.getTime()) {
    return fail(429, "resend_too_soon", "Wait before requesting another code");
  }
  if (challenge.sendCount >= OTP_MAX_SENDS) {
    await db
      .update(whatsappConsentChallenges)
      .set({ status: "failed", updatedAt: now })
      .where(eq(whatsappConsentChallenges.id, challenge.id));
    return fail(429, "resend_limit", "Too many codes were sent. Start again.");
  }

  const code = generateOtp();
  const otpExpiresAt = new Date(now.getTime() + OTP_TTL_MS);
  const resendAvailableAt = new Date(now.getTime() + OTP_RESEND_DELAY_MS);
  await db
    .update(whatsappConsentChallenges)
    .set({
      otpHash: hashOtp(challenge.id, code),
      otpExpiresAt,
      resendAvailableAt,
      attemptCount: 0,
      sendCount: sql`${whatsappConsentChallenges.sendCount} + 1`,
      updatedAt: now,
    })
    .where(eq(whatsappConsentChallenges.id, challenge.id));

  const sent = await sendOtpFor(challenge, code);
  if (!sent.ok) {
    await db
      .update(whatsappConsentChallenges)
      .set({ otpDeliveryStatus: `send_${sent.code}`, updatedAt: new Date() })
      .where(eq(whatsappConsentChallenges.id, challenge.id));
    return fail(sent.status === 503 ? 503 : 502, "otp_send_failed", sent.message);
  }
  await db
    .update(whatsappConsentChallenges)
    .set({ otpMessageId: sent.messageId, otpDeliveryStatus: "accepted", updatedAt: new Date() })
    .where(eq(whatsappConsentChallenges.id, challenge.id));

  return {
    ok: true,
    otpExpiresAt: otpExpiresAt.toISOString(),
    resendAvailableAt: resendAvailableAt.toISOString(),
    ...(devEchoEnabled() && !whatsappConfigured() ? { devOtp: code } : {}),
  };
}

// ---------------------------------------------------------------------------
// Step 4: verify OTP -> session token + notice
// ---------------------------------------------------------------------------

export async function verifyWhatsAppOtp(input: { challengeId: string; code: string }): Promise<
  | { ok: true; sessionToken: string; notice: WhatsAppNotice; phoneMasked: string }
  | (ChallengeError & { attemptsLeft?: number })
> {
  const challenge = await loadChallenge(input.challengeId);
  if (!challenge) return fail(404, "not_found", "This request was not found");
  if (challenge.status === "verified" || challenge.status === "completed") {
    return fail(409, "already_verified", "This number was already verified. Reload the page.");
  }
  if (challenge.status !== "otp_sent") {
    return fail(409, "challenge_closed", "This request is closed. Start again.");
  }
  const now = new Date();
  if (challenge.otpExpiresAt.getTime() <= now.getTime()) {
    await db
      .update(whatsappConsentChallenges)
      .set({ status: "expired", updatedAt: now })
      .where(eq(whatsappConsentChallenges.id, challenge.id));
    return fail(410, "otp_expired", "This code has expired. Request a new one.");
  }
  if (challenge.attemptCount >= OTP_MAX_ATTEMPTS) {
    await db
      .update(whatsappConsentChallenges)
      .set({ status: "failed", updatedAt: now })
      .where(eq(whatsappConsentChallenges.id, challenge.id));
    return fail(429, "too_many_attempts", "Too many wrong codes. Start again.");
  }

  if (!otpMatches(challenge.id, input.code, challenge.otpHash)) {
    const attempts = challenge.attemptCount + 1;
    const exhausted = attempts >= OTP_MAX_ATTEMPTS;
    await db
      .update(whatsappConsentChallenges)
      .set({
        attemptCount: attempts,
        status: exhausted ? "failed" : "otp_sent",
        updatedAt: now,
      })
      .where(eq(whatsappConsentChallenges.id, challenge.id));
    return {
      ...fail(
        exhausted ? 429 : 400,
        exhausted ? "too_many_attempts" : "otp_incorrect",
        exhausted ? "Too many wrong codes. Start again." : "That code is not correct",
      ),
      attemptsLeft: Math.max(0, OTP_MAX_ATTEMPTS - attempts),
    };
  }

  const sessionToken = generateSessionToken();
  const [updated] = await db
    .update(whatsappConsentChallenges)
    .set({
      status: "verified",
      verifiedAt: now,
      sessionTokenHash: hashSessionToken(sessionToken),
      updatedAt: now,
    })
    .where(
      and(
        eq(whatsappConsentChallenges.id, challenge.id),
        eq(whatsappConsentChallenges.status, "otp_sent"),
      ),
    )
    .returning({ id: whatsappConsentChallenges.id });
  if (!updated) return fail(409, "already_verified", "This number was already verified. Reload the page.");

  const website = await db
    .select({ name: websites.name })
    .from(websites)
    .where(eq(websites.id, challenge.websiteId))
    .limit(1)
    .then((rows) => rows[0]);

  return {
    ok: true,
    sessionToken,
    phoneMasked: maskPhone(challenge.phoneE164),
    notice: noticeFromSnapshot(challenge.noticeSnapshot, website?.name ?? "this organisation"),
  };
}

// ---------------------------------------------------------------------------
// Session-scoped reads
// ---------------------------------------------------------------------------

async function challengeForSession(challengeId: string, sessionToken: string) {
  const challenge = await loadChallenge(challengeId);
  if (!challenge) return null;
  if (!sessionTokenMatches(sessionToken, challenge.sessionTokenHash)) return null;
  return challenge;
}

async function summaryFor(challenge: Challenge): Promise<WhatsAppConsentSummary | null> {
  if (!challenge.consentId) return null;
  const [record] = await db
    .select({
      id: consentRecords.id,
      consentId: consentRecords.consentId,
      status: consentRecords.status,
      stateVersion: consentRecords.stateVersion,
      consentedAt: consentRecords.consentedAt,
      expiresAt: consentRecords.expiresAt,
      withdrawnAt: consentRecords.withdrawnAt,
      websiteName: websites.name,
    })
    .from(consentRecords)
    .innerJoin(websites, eq(consentRecords.websiteId, websites.id))
    .where(
      and(
        eq(consentRecords.consentId, challenge.consentId),
        eq(consentRecords.websiteId, challenge.websiteId),
      ),
    )
    .limit(1);
  if (!record) return null;
  const decisionRows = await db
    .select({
      purposeId: consentDecisions.purposeId,
      granted: consentDecisions.granted,
      name: purposes.name,
      isRequired: purposes.isRequired,
    })
    .from(consentDecisions)
    .innerJoin(purposes, eq(consentDecisions.purposeId, purposes.id))
    .where(eq(consentDecisions.consentRecordId, record.id));
  return {
    consentId: record.consentId,
    status: record.status,
    stateVersion: record.stateVersion,
    consentedAt: record.consentedAt?.toISOString() ?? null,
    expiresAt: record.expiresAt?.toISOString() ?? null,
    withdrawnAt: record.withdrawnAt?.toISOString() ?? null,
    websiteName: record.websiteName,
    phoneMasked: maskPhone(challenge.phoneE164),
    decisions: decisionRows
      .filter((row): row is typeof row & { purposeId: string } => Boolean(row.purposeId))
      .map((row) => ({
        purposeId: row.purposeId,
        name: row.name,
        isRequired: row.isRequired,
        granted: row.granted,
      })),
  };
}

export async function getWhatsAppConsentSummary(input: {
  challengeId: string;
  sessionToken: string;
}): Promise<{ ok: true; summary: WhatsAppConsentSummary } | ChallengeError> {
  const challenge = await challengeForSession(input.challengeId, input.sessionToken);
  if (!challenge) return fail(404, "not_found", "This request was not found");
  if (challenge.status !== "completed") {
    return fail(409, "not_completed", "No consent has been recorded for this request yet");
  }
  const summary = await summaryFor(challenge);
  if (!summary) return fail(404, "record_missing", "The consent record could not be found");
  return { ok: true, summary };
}

// ---------------------------------------------------------------------------
// Step 5: decision -> consent record + confirmation message
// ---------------------------------------------------------------------------

export async function submitWhatsAppDecision(input: {
  challengeId: string;
  sessionToken: string;
  submission: ConsentSubmission;
}): Promise<{ ok: true; summary: WhatsAppConsentSummary; idempotent: boolean } | ChallengeError> {
  const challenge = await challengeForSession(input.challengeId, input.sessionToken);
  if (!challenge) return fail(404, "not_found", "This request was not found");

  if (challenge.status === "completed") {
    const summary = await summaryFor(challenge);
    if (!summary) return fail(404, "record_missing", "The consent record could not be found");
    return { ok: true, summary, idempotent: true };
  }
  if (challenge.status !== "verified") {
    return fail(409, "not_verified", "Verify the mobile number before giving consent");
  }

  const [website] = await db
    .select({ name: websites.name, siteKey: websites.siteKey })
    .from(websites)
    .where(eq(websites.id, challenge.websiteId))
    .limit(1);
  if (!website) return fail(404, "website_not_found", "Website not found");

  // Only one writer may complete a challenge.
  const now = new Date();
  const [claimed] = await db
    .update(whatsappConsentChallenges)
    .set({ status: "completing", updatedAt: now })
    .where(
      and(
        eq(whatsappConsentChallenges.id, challenge.id),
        eq(whatsappConsentChallenges.status, "verified"),
      ),
    )
    .returning({ id: whatsappConsentChallenges.id });
  if (!claimed) {
    const latest = await loadChallenge(challenge.id);
    const summary = latest ? await summaryFor(latest) : null;
    if (summary) return { ok: true, summary, idempotent: true };
    return fail(409, "in_progress", "This consent is being saved. Try again in a moment.");
  }

  let written;
  try {
    written = await writeWhatsAppConsent({
      organizationId: challenge.organizationId,
      websiteId: challenge.websiteId,
      siteKey: website.siteKey,
      policyId: challenge.policyId,
      policyVersionId: challenge.policyVersionId,
      policyVersionNumber: challenge.policyVersionNumber,
      jurisdiction: challenge.jurisdiction,
      locale: challenge.locale,
      noticeHash: challenge.noticeHash,
      noticeSnapshot: challenge.noticeSnapshot,
      phoneHash: challenge.phoneHash,
      phoneLast4: challenge.phoneLast4,
      challengeId: challenge.id,
      otpMessageId: challenge.otpMessageId,
      templateName: otpTemplateName(),
      submission: input.submission,
    });
  } catch (error) {
    await db
      .update(whatsappConsentChallenges)
      .set({ status: "verified", updatedAt: new Date() })
      .where(eq(whatsappConsentChallenges.id, challenge.id));
    logger.error("WhatsApp consent write failed", {
      operation: "whatsapp.consent.write",
      challengeId: challenge.id,
      error,
    });
    return fail(500, "write_failed", "Could not save the consent. Try again.");
  }

  await db
    .update(whatsappConsentChallenges)
    .set({
      status: "completed",
      consentId: written.consentId,
      completedAt: written.consentedAt,
      updatedAt: new Date(),
    })
    .where(eq(whatsappConsentChallenges.id, challenge.id));

  if (whatsappConfigured()) {
    after(async () => {
      const sent = await sendConsentConfirmationTemplate({
        to: challenge.phoneE164,
        websiteName: website.name,
        consentId: written.consentId,
        recordedAt: written.consentedAt,
      });
      if (sent.ok) {
        await db
          .update(whatsappConsentChallenges)
          .set({ confirmationMessageId: sent.messageId, updatedAt: new Date() })
          .where(eq(whatsappConsentChallenges.id, challenge.id));
      } else {
        logger.warn("WhatsApp confirmation not sent", {
          operation: "whatsapp.confirm",
          challengeId: challenge.id,
          code: sent.code,
        });
      }
    });
  }

  const latest = await loadChallenge(challenge.id);
  const summary = latest ? await summaryFor(latest) : null;
  if (!summary) return fail(500, "summary_failed", "Consent saved, but the summary could not be loaded");
  return { ok: true, summary, idempotent: false };
}

// ---------------------------------------------------------------------------
// Withdrawal: from the summary screen or from a STOP reply
// ---------------------------------------------------------------------------

async function withdrawByConsent(input: {
  consentId: string;
  websiteId: string;
  eventData: Record<string, unknown>;
}): Promise<{ ok: true; withdrawnAt: Date } | ChallengeError> {
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
      and(eq(consentRecords.consentId, input.consentId), eq(consentRecords.websiteId, input.websiteId)),
    )
    .limit(1);
  if (!record) return fail(404, "record_missing", "The consent record could not be found");
  if (record.status === "withdrawn") return fail(409, "already_withdrawn", "Consent was already withdrawn");

  const result = await withdrawConsentRecord({
    record,
    expectedStateVersion: record.stateVersion,
    source: WHATSAPP_CONSENT_SOURCE,
    eventData: input.eventData,
  });
  if (!result.ok) {
    return result.code === "already_withdrawn"
      ? fail(409, "already_withdrawn", "Consent was already withdrawn")
      : fail(409, "state_conflict", "Consent state changed; reload and retry");
  }
  return { ok: true, withdrawnAt: result.withdrawnAt };
}

export async function withdrawWhatsAppConsent(input: {
  challengeId: string;
  sessionToken: string;
}): Promise<{ ok: true; summary: WhatsAppConsentSummary } | ChallengeError> {
  const challenge = await challengeForSession(input.challengeId, input.sessionToken);
  if (!challenge || !challenge.consentId) return fail(404, "not_found", "This request was not found");
  const result = await withdrawByConsent({
    consentId: challenge.consentId,
    websiteId: challenge.websiteId,
    eventData: { channel: WHATSAPP_CONSENT_SOURCE, via: "summary_screen", challengeId: challenge.id },
  });
  if (!result.ok) return result;
  const summary = await summaryFor(challenge);
  if (!summary) return fail(500, "summary_failed", "Withdrawn, but the summary could not be loaded");
  return { ok: true, summary };
}

/**
 * STOP reply handling. The inbound message does not carry a website, so this
 * withdraws the most recent active WhatsApp consent for that phone number.
 */
export async function withdrawLatestWhatsAppConsentForPhone(input: {
  phone: string;
  inboundMessageId: string;
}): Promise<{ ok: true; consentId: string } | ChallengeError> {
  const phoneE164 = normalizePhoneE164(input.phone.startsWith("+") ? input.phone : `+${input.phone}`);
  if (!phoneE164) return fail(400, "invalid_phone", "Unrecognised sender");
  const phoneHash = hashPhone(phoneE164);
  const rows = await db
    .select({
      challengeId: whatsappConsentChallenges.id,
      websiteId: whatsappConsentChallenges.websiteId,
      consentId: whatsappConsentChallenges.consentId,
      status: consentRecords.status,
    })
    .from(whatsappConsentChallenges)
    .innerJoin(
      consentRecords,
      and(
        eq(consentRecords.consentId, whatsappConsentChallenges.consentId),
        eq(consentRecords.websiteId, whatsappConsentChallenges.websiteId),
      ),
    )
    .where(
      and(
        eq(whatsappConsentChallenges.phoneHash, phoneHash),
        eq(whatsappConsentChallenges.status, "completed"),
      ),
    )
    .orderBy(desc(whatsappConsentChallenges.completedAt))
    .limit(5);
  const target = rows.find((row) => row.status !== "withdrawn" && row.consentId);
  if (!target?.consentId) return fail(404, "nothing_to_withdraw", "No active consent for this number");

  const result = await withdrawByConsent({
    consentId: target.consentId,
    websiteId: target.websiteId,
    eventData: {
      channel: WHATSAPP_CONSENT_SOURCE,
      via: "stop_reply",
      challengeId: target.challengeId,
      inboundMessageId: input.inboundMessageId,
    },
  });
  if (!result.ok) return result;
  return { ok: true, consentId: target.consentId };
}

// ---------------------------------------------------------------------------
// Delivery webhook
// ---------------------------------------------------------------------------

export async function recordWhatsAppDeliveryStatus(input: {
  messageId: string;
  status: string;
  errorCode?: string | null;
}): Promise<void> {
  const status = input.status.toLowerCase().slice(0, 30);
  const value = input.errorCode ? `${status}:${input.errorCode}`.slice(0, 30) : status;
  await db
    .update(whatsappConsentChallenges)
    .set({ otpDeliveryStatus: value, updatedAt: new Date() })
    .where(eq(whatsappConsentChallenges.otpMessageId, input.messageId));
}
