import "server-only";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { consentEvents } from "@/db/schema/consent-events";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConsentChoice = "accept-all" | "reject-all" | "granular";

export type PurposeDecision = {
  purposeId: string;
  granted: boolean;
};

export type VendorDecision = {
  vendorId: string;
  granted: boolean;
};

export type ConsentSubmission = {
  choice: ConsentChoice;
  purposeDecisions?: PurposeDecision[];
  vendorDecisions?: VendorDecision[];
};

export type DecisionRow = {
  purposeId: string | null;
  vendorId: string | null;
  decision: string;
  granted: boolean;
  decidedAt: Date;
};

// ---------------------------------------------------------------------------
// generateConsentId — stable UUID for a visitor's consent record
// ---------------------------------------------------------------------------

export function generateConsentId(): string {
  return `cid_${randomUUID()}`;
}

// ---------------------------------------------------------------------------
// computeExpiry — consent expiry timestamp based on policy config
// ---------------------------------------------------------------------------

export function computeExpiry(consentExpireDays: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(1, Math.min(3650, consentExpireDays)));
  return d;
}

// ---------------------------------------------------------------------------
// buildDecisionRows — convert a ConsentSubmission into flat decision rows
// that can be bulk-inserted into consent_decisions.
//
// - accept-all:  all provided purposeIds and vendorIds granted = true
// - reject-all:  all provided purposeIds and vendorIds granted = false
//                (required purposes are kept granted = true)
// - granular:    use the caller-supplied purposeDecisions / vendorDecisions
// ---------------------------------------------------------------------------

export function buildDecisionRows(
  submission: ConsentSubmission,
  allPurposeIds: string[],
  allVendorIds: string[],
  requiredPurposeIds: Set<string>,
): DecisionRow[] {
  const now = new Date();
  const rows: DecisionRow[] = [];

  // Helper: resolve granted value respecting required-purpose constraint.
  function resolveGranted(purposeId: string | null, raw: boolean): boolean {
    if (purposeId && requiredPurposeIds.has(purposeId)) return true;
    return raw;
  }

  if (submission.choice === "accept-all") {
    for (const pid of allPurposeIds) {
      rows.push({
        purposeId: pid,
        vendorId: null,
        decision: "accept-all",
        granted: true,
        decidedAt: now,
      });
    }
    for (const vid of allVendorIds) {
      rows.push({
        purposeId: null,
        vendorId: vid,
        decision: "accept-all",
        granted: true,
        decidedAt: now,
      });
    }
    return rows;
  }

  if (submission.choice === "reject-all") {
    for (const pid of allPurposeIds) {
      rows.push({
        purposeId: pid,
        vendorId: null,
        decision: "reject-all",
        granted: resolveGranted(pid, false),
        decidedAt: now,
      });
    }
    for (const vid of allVendorIds) {
      rows.push({
        purposeId: null,
        vendorId: vid,
        decision: "reject-all",
        granted: false,
        decidedAt: now,
      });
    }
    return rows;
  }

  // Granular — use caller-provided decisions, fall back to false for any
  // purpose/vendor not explicitly included.
  const purposeMap = new Map<string, boolean>(
    (submission.purposeDecisions ?? []).map((d) => [d.purposeId, d.granted]),
  );
  const vendorMap = new Map<string, boolean>(
    (submission.vendorDecisions ?? []).map((d) => [d.vendorId, d.granted]),
  );

  for (const pid of allPurposeIds) {
    const raw = purposeMap.get(pid) ?? false;
    rows.push({
      purposeId: pid,
      vendorId: null,
      decision: "granular",
      granted: resolveGranted(pid, raw),
      decidedAt: now,
    });
  }
  for (const vid of allVendorIds) {
    rows.push({
      purposeId: null,
      vendorId: vid,
      decision: "granular",
      granted: vendorMap.get(vid) ?? false,
      decidedAt: now,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// appendConsentEvent — append an immutable event to the consent_events log
// ---------------------------------------------------------------------------

export async function appendConsentEvent({
  consentRecordId,
  policyVersionId,
  eventType,
  eventData,
  source = "web",
}: {
  consentRecordId: string;
  policyVersionId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  source?: string;
}): Promise<void> {
  await db.insert(consentEvents).values({
    consentRecordId,
    policyVersionId,
    eventType,
    eventData,
    source,
    occurredAt: new Date(),
  });
}

// ---------------------------------------------------------------------------
// isConsentExpired — returns true when the record has passed its expiresAt
// timestamp and has not been explicitly withdrawn.
// A null expiresAt means the consent never expires (treat as valid).
// This function is pure (no I/O) and safe to call in both server and edge.
// ---------------------------------------------------------------------------

export function isConsentExpired(record: {
  expiresAt: Date | null;
  status: string;
  withdrawnAt: Date | null;
}): boolean {
  // Withdrawn consent is handled separately — not considered "expired".
  if (record.status === "withdrawn" || record.withdrawnAt !== null) return false;
  // No expiry date → never expires.
  if (!record.expiresAt) return false;
  return new Date(record.expiresAt) < new Date();
}

// ---------------------------------------------------------------------------
// deriveOverallStatus — given a list of decisions, determine the overall
// consent record status string.
// ---------------------------------------------------------------------------

export function deriveOverallStatus(decisions: DecisionRow[]): string {
  if (decisions.length === 0) return "pending";
  const allGranted = decisions.every((d) => d.granted);
  const noneGranted = decisions.every((d) => !d.granted);
  if (allGranted) return "accepted";
  if (noneGranted) return "rejected";
  return "partial";
}
