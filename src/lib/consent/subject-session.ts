import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/db";
import { consentSubjectSessions } from "@/db/schema/consent-subject-sessions";
import { consentSubjects } from "@/db/schema/consent-subjects";
import { flushPendingAccountPreferenceNotification } from "@/lib/consent/revocation-notification";
import { normalizeEmail } from "@/lib/consent/revocation-notification-core";

export const SUBJECT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const SUBJECT_KEY_RE = /^[A-Za-z0-9_.:@-]{3,255}$/;
export const SUBJECT_TOKEN_PREFIX = "css_";

export type ConsentSubjectRow = {
  id: string;
  organizationId: string;
  websiteId: string;
  subjectKey: string;
  email: string | null;
  emailVerifiedAt: Date | null;
  authSource: string;
};

export type SubjectSessionContext = {
  sessionId: string;
  subject: ConsentSubjectRow;
  expiresAt: Date;
};

export function isValidSubjectKey(value: string): boolean {
  return SUBJECT_KEY_RE.test(value);
}

export function hashSubjectSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function mintSubjectSessionToken(): string {
  return `${SUBJECT_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function readSubjectSessionToken(request: Request): string | null {
  const header =
    request.headers.get("x-cmp-subject-session")?.trim() ||
    request.headers.get("authorization")?.trim() ||
    "";
  if (!header) return null;
  const bearer = /^Bearer\s+(.+)$/i.exec(header);
  const token = (bearer?.[1] || header).trim();
  if (!token.startsWith(SUBJECT_TOKEN_PREFIX) || token.length < 20) return null;
  return token;
}

function tokenHashesEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function upsertConsentSubject(input: {
  organizationId: string;
  websiteId: string;
  subjectKey: string;
  authSource: "clerk" | "api_key";
  email?: string | null;
}): Promise<ConsentSubjectRow> {
  const email = input.email ? normalizeEmail(input.email) : null;
  const now = new Date();

  const [existing] = await db
    .select({
      id: consentSubjects.id,
      organizationId: consentSubjects.organizationId,
      websiteId: consentSubjects.websiteId,
      subjectKey: consentSubjects.subjectKey,
      email: consentSubjects.email,
      emailVerifiedAt: consentSubjects.emailVerifiedAt,
      authSource: consentSubjects.authSource,
    })
    .from(consentSubjects)
    .where(
      and(
        eq(consentSubjects.websiteId, input.websiteId),
        eq(consentSubjects.subjectKey, input.subjectKey),
        eq(consentSubjects.organizationId, input.organizationId),
      ),
    )
    .limit(1);

  if (existing) {
    const nextEmail = email ?? existing.email;
    const nextVerifiedAt = email ? now : existing.emailVerifiedAt;
    const emailNewlyTrusted = Boolean(email && email !== existing.email);
    if (nextEmail !== existing.email || nextVerifiedAt !== existing.emailVerifiedAt) {
      await db
        .update(consentSubjects)
        .set({
          email: nextEmail,
          emailVerifiedAt: nextVerifiedAt,
          updatedAt: now,
        })
        .where(eq(consentSubjects.id, existing.id));
    }
    if (emailNewlyTrusted && nextEmail) {
      void flushPendingAccountPreferenceNotification({
        organizationId: existing.organizationId,
        websiteId: existing.websiteId,
        subjectId: existing.id,
        subjectKey: existing.subjectKey,
        subjectEmail: nextEmail,
      }).catch(() => null);
    }
    return {
      ...existing,
      email: nextEmail,
      emailVerifiedAt: nextVerifiedAt,
    };
  }

  const [created] = await db
    .insert(consentSubjects)
    .values({
      organizationId: input.organizationId,
      websiteId: input.websiteId,
      subjectKey: input.subjectKey,
      email,
      emailVerifiedAt: email ? now : null,
      authSource: input.authSource,
    })
    .returning({
      id: consentSubjects.id,
      organizationId: consentSubjects.organizationId,
      websiteId: consentSubjects.websiteId,
      subjectKey: consentSubjects.subjectKey,
      email: consentSubjects.email,
      emailVerifiedAt: consentSubjects.emailVerifiedAt,
      authSource: consentSubjects.authSource,
    });

  return created;
}

export async function createSubjectSession(input: {
  organizationId: string;
  websiteId: string;
  subjectId: string;
  ttlMs?: number;
}): Promise<{ token: string; expiresAt: Date; sessionId: string }> {
  const token = mintSubjectSessionToken();
  const expiresAt = new Date(Date.now() + (input.ttlMs ?? SUBJECT_SESSION_TTL_MS));
  const [row] = await db
    .insert(consentSubjectSessions)
    .values({
      organizationId: input.organizationId,
      websiteId: input.websiteId,
      subjectId: input.subjectId,
      tokenHash: hashSubjectSessionToken(token),
      expiresAt,
    })
    .returning({ id: consentSubjectSessions.id });

  return { token, expiresAt, sessionId: row.id };
}

export async function resolveSubjectSession(
  token: string,
): Promise<SubjectSessionContext | null> {
  const tokenHash = hashSubjectSessionToken(token);
  const now = new Date();
  const [row] = await db
    .select({
      sessionId: consentSubjectSessions.id,
      expiresAt: consentSubjectSessions.expiresAt,
      revokedAt: consentSubjectSessions.revokedAt,
      tokenHash: consentSubjectSessions.tokenHash,
      subjectId: consentSubjects.id,
      organizationId: consentSubjects.organizationId,
      websiteId: consentSubjects.websiteId,
      subjectKey: consentSubjects.subjectKey,
      email: consentSubjects.email,
      emailVerifiedAt: consentSubjects.emailVerifiedAt,
      authSource: consentSubjects.authSource,
    })
    .from(consentSubjectSessions)
    .innerJoin(consentSubjects, eq(consentSubjects.id, consentSubjectSessions.subjectId))
    .where(
      and(
        eq(consentSubjectSessions.tokenHash, tokenHash),
        isNull(consentSubjectSessions.revokedAt),
        gt(consentSubjectSessions.expiresAt, now),
      ),
    )
    .limit(1);

  if (!row) return null;
  if (!tokenHashesEqual(row.tokenHash, tokenHash)) return null;

  return {
    sessionId: row.sessionId,
    expiresAt: row.expiresAt,
    subject: {
      id: row.subjectId,
      organizationId: row.organizationId,
      websiteId: row.websiteId,
      subjectKey: row.subjectKey,
      email: row.email,
      emailVerifiedAt: row.emailVerifiedAt,
      authSource: row.authSource,
    },
  };
}

export async function revokeSubjectSessionToken(token: string): Promise<boolean> {
  const tokenHash = hashSubjectSessionToken(token);
  const result = await db
    .update(consentSubjectSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(consentSubjectSessions.tokenHash, tokenHash),
        isNull(consentSubjectSessions.revokedAt),
      ),
    )
    .returning({ id: consentSubjectSessions.id });
  return result.length > 0;
}

export async function revokeSubjectSessionsForSubject(input: {
  organizationId: string;
  websiteId: string;
  subjectId: string;
}): Promise<number> {
  const result = await db
    .update(consentSubjectSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(consentSubjectSessions.organizationId, input.organizationId),
        eq(consentSubjectSessions.websiteId, input.websiteId),
        eq(consentSubjectSessions.subjectId, input.subjectId),
        isNull(consentSubjectSessions.revokedAt),
      ),
    )
    .returning({ id: consentSubjectSessions.id });
  return result.length;
}
