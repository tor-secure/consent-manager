import "server-only";

import { after } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { consentEvidenceSnapshots } from "@/db/schema/consent-evidence-snapshots";
import { consentRecords } from "@/db/schema/consent-records";
import { appendConsentEvent } from "@/lib/consent-engine";
import { buildWithdrawalEvidenceSnapshot } from "@/lib/consent-evidence-write";
import { logger } from "@/lib/logger";

export type WithdrawableRecord = {
  id: string;
  organizationId: string;
  consentId: string;
  status: string;
  stateVersion: number;
  policyVersionId: string;
};

export type WithdrawConsentResult =
  | { ok: true; withdrawnAt: Date; stateVersion: number }
  | { ok: false; code: "already_withdrawn" | "state_conflict" };

/**
 * Shared withdrawal transaction used by the public SDK route and by the
 * WhatsApp flow. Marks the record withdrawn, keeps the historical grant,
 * writes a withdrawal evidence snapshot, and appends a consent event.
 */
export async function withdrawConsentRecord(input: {
  record: WithdrawableRecord;
  expectedStateVersion: number;
  source?: string;
  eventData?: Record<string, unknown>;
}): Promise<WithdrawConsentResult> {
  const { record, expectedStateVersion } = input;
  if (record.status === "withdrawn") return { ok: false, code: "already_withdrawn" };
  if (record.stateVersion !== expectedStateVersion) return { ok: false, code: "state_conflict" };

  const now = new Date();
  const [priorEvidence] = await db
    .select()
    .from(consentEvidenceSnapshots)
    .where(
      and(
        eq(consentEvidenceSnapshots.organizationId, record.organizationId),
        eq(consentEvidenceSnapshots.consentId, record.consentId),
      ),
    )
    .orderBy(desc(consentEvidenceSnapshots.consentedAt))
    .limit(1);

  let withdrawn: { stateVersion: number } | undefined;
  try {
    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(consentRecords)
        .set({
          status: "withdrawn",
          stateVersion: sql`${consentRecords.stateVersion} + 1`,
          withdrawnAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(consentRecords.id, record.id),
            eq(consentRecords.stateVersion, expectedStateVersion),
          ),
        )
        .returning({ stateVersion: consentRecords.stateVersion });
      if (!updated) throw new Error("CONSENT_STATE_CONFLICT");
      withdrawn = updated;

      if (priorEvidence) {
        const snapshot = buildWithdrawalEvidenceSnapshot({
          prior: priorEvidence,
          stateVersion: updated.stateVersion,
          withdrawnAt: now,
        });
        await tx.insert(consentEvidenceSnapshots).values(snapshot.values);
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CONSENT_STATE_CONFLICT") {
      return { ok: false, code: "state_conflict" };
    }
    throw error;
  }
  if (!withdrawn) return { ok: false, code: "state_conflict" };

  const source = input.source ?? priorEvidence?.source ?? "web";
  try {
    after(() =>
      appendConsentEvent({
        consentRecordId: record.id,
        policyVersionId: record.policyVersionId,
        eventType: "consent.withdrawn",
        source,
        eventData: {
          previousStatus: record.status,
          withdrawnAt: now.toISOString(),
          ...(input.eventData ?? {}),
        },
      }).catch((eventError) => {
        logger.error("Append withdrawal consent event failed", {
          operation: "consent.withdraw.event",
          consentRecordId: record.id,
          policyVersionId: record.policyVersionId,
          error: eventError,
        });
      }),
    );
  } catch (eventError) {
    logger.error("Schedule withdrawal consent event failed", {
      operation: "consent.withdraw.event",
      consentRecordId: record.id,
      policyVersionId: record.policyVersionId,
      error: eventError,
    });
  }

  return { ok: true, withdrawnAt: now, stateVersion: withdrawn.stateVersion };
}
