import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { accountConsentDecisions } from "@/db/schema/account-consent-decisions";
import { accountConsentRecords } from "@/db/schema/account-consent-records";
import type { ConsentSubjectRow } from "@/lib/consent/subject-session";

export type AccountDecisionInput = {
  purposeId: string | null;
  vendorId: string | null;
  granted: boolean;
  decision?: string;
};

export type AccountConsentSnapshot = {
  exists: boolean;
  recordId: string | null;
  status: string | null;
  stateVersion: number;
  policyVersionId: string | null;
  consentedAt: string | null;
  expiresAt: string | null;
  withdrawnAt: string | null;
  decisions: Array<{
    purposeId: string | null;
    vendorId: string | null;
    granted: boolean;
    decision: string;
    decidedAt: string;
  }>;
  subjectKey: string;
  email: string | null;
};

export async function loadAccountConsentSnapshot(
  subject: ConsentSubjectRow,
): Promise<AccountConsentSnapshot> {
  const [record] = await db
    .select({
      id: accountConsentRecords.id,
      status: accountConsentRecords.status,
      stateVersion: accountConsentRecords.stateVersion,
      policyVersionId: accountConsentRecords.policyVersionId,
      consentedAt: accountConsentRecords.consentedAt,
      expiresAt: accountConsentRecords.expiresAt,
      withdrawnAt: accountConsentRecords.withdrawnAt,
    })
    .from(accountConsentRecords)
    .where(
      and(
        eq(accountConsentRecords.subjectId, subject.id),
        eq(accountConsentRecords.websiteId, subject.websiteId),
        eq(accountConsentRecords.organizationId, subject.organizationId),
      ),
    )
    .limit(1);

  if (!record) {
    return {
      exists: false,
      recordId: null,
      status: null,
      stateVersion: 0,
      policyVersionId: null,
      consentedAt: null,
      expiresAt: null,
      withdrawnAt: null,
      decisions: [],
      subjectKey: subject.subjectKey,
      email: subject.email,
    };
  }

  const decisions = await db
    .select({
      purposeId: accountConsentDecisions.purposeId,
      vendorId: accountConsentDecisions.vendorId,
      granted: accountConsentDecisions.granted,
      decision: accountConsentDecisions.decision,
      decidedAt: accountConsentDecisions.decidedAt,
    })
    .from(accountConsentDecisions)
    .where(eq(accountConsentDecisions.accountConsentRecordId, record.id));

  return {
    exists: true,
    recordId: record.id,
    status: record.status,
    stateVersion: record.stateVersion,
    policyVersionId: record.policyVersionId,
    consentedAt: record.consentedAt?.toISOString() ?? null,
    expiresAt: record.expiresAt?.toISOString() ?? null,
    withdrawnAt: record.withdrawnAt?.toISOString() ?? null,
    decisions: decisions.map((row) => ({
      purposeId: row.purposeId,
      vendorId: row.vendorId,
      granted: row.granted,
      decision: row.decision,
      decidedAt: row.decidedAt.toISOString(),
    })),
    subjectKey: subject.subjectKey,
    email: subject.email,
  };
}

export async function saveAccountConsent(input: {
  subject: ConsentSubjectRow;
  policyVersionId: string;
  decisions: AccountDecisionInput[];
  expectedStateVersion: number;
  choice?: string;
  expiresAt?: Date | null;
  fullWithdrawal?: boolean;
}): Promise<
  | { ok: true; snapshot: AccountConsentSnapshot }
  | { ok: false; code: "STATE_CONFLICT" | "INVALID"; message: string; stateVersion?: number }
> {
  const now = new Date();
  const [existing] = await db
    .select({
      id: accountConsentRecords.id,
      stateVersion: accountConsentRecords.stateVersion,
    })
    .from(accountConsentRecords)
    .where(
      and(
        eq(accountConsentRecords.subjectId, input.subject.id),
        eq(accountConsentRecords.websiteId, input.subject.websiteId),
        eq(accountConsentRecords.organizationId, input.subject.organizationId),
      ),
    )
    .limit(1);

  const isNew = !existing;
  if (isNew && input.expectedStateVersion !== 0) {
    return {
      ok: false,
      code: "INVALID",
      message: "expectedStateVersion must be 0 when creating account consent",
    };
  }
  if (!isNew && existing.stateVersion !== input.expectedStateVersion) {
    return {
      ok: false,
      code: "STATE_CONFLICT",
      message: "Account consent state changed. Refresh and retry.",
      stateVersion: existing.stateVersion,
    };
  }

  const status = input.fullWithdrawal ? "withdrawn" : "active";
  const decisionRows = (input.fullWithdrawal
    ? input.decisions.map((row) => ({ ...row, granted: false }))
    : input.decisions
  ).map((row) => ({
    purposeId: row.purposeId,
    vendorId: row.vendorId,
    granted: Boolean(row.granted),
    decision: row.decision || (row.granted ? "granted" : "denied"),
  }));

  try {
    await db.transaction(async (tx) => {
      let recordId: string;

      if (isNew) {
        const [created] = await tx
          .insert(accountConsentRecords)
          .values({
            organizationId: input.subject.organizationId,
            websiteId: input.subject.websiteId,
            subjectId: input.subject.id,
            policyVersionId: input.policyVersionId,
            status,
            stateVersion: 1,
            source: "web",
            consentedAt: now,
            expiresAt: input.expiresAt ?? null,
            withdrawnAt: input.fullWithdrawal ? now : null,
            metadata: {
              choice: input.choice || null,
              ownership: "account",
            },
          })
          .returning({ id: accountConsentRecords.id });
        recordId = created.id;
      } else {
        const updated = await tx
          .update(accountConsentRecords)
          .set({
            policyVersionId: input.policyVersionId,
            status,
            stateVersion: sql`${accountConsentRecords.stateVersion} + 1`,
            consentedAt: now,
            expiresAt: input.expiresAt ?? null,
            withdrawnAt: input.fullWithdrawal ? now : null,
            metadata: {
              choice: input.choice || null,
              ownership: "account",
            },
            updatedAt: now,
          })
          .where(
            and(
              eq(accountConsentRecords.id, existing.id),
              eq(accountConsentRecords.stateVersion, input.expectedStateVersion),
            ),
          )
          .returning({ id: accountConsentRecords.id });

        if (updated.length === 0) {
          throw new Error("STATE_CONFLICT");
        }
        recordId = updated[0].id;

        await tx
          .delete(accountConsentDecisions)
          .where(eq(accountConsentDecisions.accountConsentRecordId, recordId));
      }

      if (decisionRows.length > 0) {
        await tx.insert(accountConsentDecisions).values(
          decisionRows.map((row) => ({
            accountConsentRecordId: recordId,
            purposeId: row.purposeId,
            vendorId: row.vendorId,
            granted: row.granted,
            decision: row.decision,
            decidedAt: now,
          })),
        );
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "STATE_CONFLICT") {
      const latest = await loadAccountConsentSnapshot(input.subject);
      return {
        ok: false,
        code: "STATE_CONFLICT",
        message: "Account consent state changed. Refresh and retry.",
        stateVersion: latest.stateVersion,
      };
    }
    throw error;
  }

  return { ok: true, snapshot: await loadAccountConsentSnapshot(input.subject) };
}
