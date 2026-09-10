import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import { californiaOptOutStates } from "@/db/schema/california-opt-out";
import { isValidConsentId } from "@/lib/sdk/public-http";

import { californiaEnforcementFromRecord, resolveCaliforniaOptOut } from "./state";
import {
  CALIFORNIA_AUDIT_ACTIONS,
  parseCaliforniaOptOutState,
  type CaliforniaOptOutRecord,
} from "./types";
import type { ClientGpcState, SecGpcHeaderState } from "./types";

function rowToRecord(row: typeof californiaOptOutStates.$inferSelect): CaliforniaOptOutRecord {
  return {
    state: parseCaliforniaOptOutState(row.state),
    source: (row.source as CaliforniaOptOutRecord["source"]) ?? "none",
    saleOptOut: row.saleOptOut === true,
    shareOptOut: row.shareOptOut === true,
    sensitivePiLimit: row.sensitivePiLimit === true,
    gpcHeader: (row.gpcHeader as SecGpcHeaderState) ?? "absent",
    gpcClient: (row.gpcClient as ClientGpcState) ?? "unknown",
    gpcActive: row.state === "gpc_opted_out" || row.source === "gpc" || row.source === "mixed",
    jurisdiction: row.jurisdiction,
    policyVersionId: row.policyVersionId,
  };
}

export async function loadCaliforniaOptOut(input: {
  organizationId: string;
  websiteId: string;
  consentId: string;
}): Promise<CaliforniaOptOutRecord | null> {
  if (!isValidConsentId(input.consentId)) return null;
  const [row] = await db
    .select()
    .from(californiaOptOutStates)
    .where(
      and(
        eq(californiaOptOutStates.organizationId, input.organizationId),
        eq(californiaOptOutStates.websiteId, input.websiteId),
        eq(californiaOptOutStates.consentId, input.consentId),
      ),
    )
    .limit(1);
  return row ? rowToRecord(row) : null;
}

export async function upsertCaliforniaOptOut(input: {
  organizationId: string;
  websiteId: string;
  consentId: string;
  visitorId?: string | null;
  expiresAt?: Date | null;
  userId?: string | null;
  resolved: CaliforniaOptOutRecord;
}): Promise<CaliforniaOptOutRecord> {
  const now = new Date();
  const values = {
    organizationId: input.organizationId,
    websiteId: input.websiteId,
    consentId: input.consentId,
    visitorId: input.visitorId ?? null,
    state: input.resolved.state,
    source: input.resolved.source,
    saleOptOut: input.resolved.saleOptOut,
    shareOptOut: input.resolved.shareOptOut,
    sensitivePiLimit: input.resolved.sensitivePiLimit,
    gpcHeader: input.resolved.gpcHeader,
    gpcClient: input.resolved.gpcClient,
    jurisdiction: input.resolved.jurisdiction,
    policyVersionId: input.resolved.policyVersionId,
    effectiveAt: now,
    expiresAt: input.expiresAt ?? null,
    updatedAt: now,
  };

  const [existing] = await db
    .select()
    .from(californiaOptOutStates)
    .where(
      and(
        eq(californiaOptOutStates.organizationId, input.organizationId),
        eq(californiaOptOutStates.websiteId, input.websiteId),
        eq(californiaOptOutStates.consentId, input.consentId),
      ),
    )
    .limit(1);

  const saved = existing
    ? (
        await db
          .update(californiaOptOutStates)
          .set(values)
          .where(eq(californiaOptOutStates.id, existing.id))
          .returning()
      )[0]
    : (
        await db
          .insert(californiaOptOutStates)
          .values({ ...values, createdAt: now })
          .returning()
      )[0];

  const previous = existing ? rowToRecord(existing) : null;
  const next = rowToRecord(saved);
  const changed =
    !previous ||
    previous.state !== next.state ||
    previous.saleOptOut !== next.saleOptOut ||
    previous.shareOptOut !== next.shareOptOut ||
    previous.sensitivePiLimit !== next.sensitivePiLimit;

  if (changed) {
    const actions: Array<(typeof CALIFORNIA_AUDIT_ACTIONS)[keyof typeof CALIFORNIA_AUDIT_ACTIONS]> = [
      CALIFORNIA_AUDIT_ACTIONS.californiaOptOutChanged,
    ];
    if (next.gpcActive && previous?.gpcActive !== true) {
      actions.push(CALIFORNIA_AUDIT_ACTIONS.gpcDetected, CALIFORNIA_AUDIT_ACTIONS.gpcOptOutApplied);
    }
    if (next.state === "manual_opt_out" && previous?.state !== "manual_opt_out") {
      actions.push(CALIFORNIA_AUDIT_ACTIONS.manualOptOutCreated);
    }
    if (previous?.state === "manual_opt_out" && next.state === "not_opted_out") {
      actions.push(CALIFORNIA_AUDIT_ACTIONS.manualOptOutWithdrawn);
    }
    if (next.saleOptOut && previous?.saleOptOut !== true) actions.push(CALIFORNIA_AUDIT_ACTIONS.doNotSellEnabled);
    if (next.shareOptOut && previous?.shareOptOut !== true) actions.push(CALIFORNIA_AUDIT_ACTIONS.doNotShareEnabled);
    if (next.sensitivePiLimit && previous?.sensitivePiLimit !== true) {
      actions.push(CALIFORNIA_AUDIT_ACTIONS.sensitivePiLimitEnabled);
    }
    await db.insert(auditLogs).values(
      actions.map((action) => ({
        organizationId: input.organizationId,
        userId: input.userId ?? null,
        action,
        resourceType: "california_opt_out",
        resourceId: saved.id,
        description: `California opt-out ${action.toLowerCase().replaceAll("_", " ")}`,
        metadata: {
          websiteId: input.websiteId,
          consentId: input.consentId,
          state: next.state,
          source: next.source,
          saleOptOut: next.saleOptOut,
          shareOptOut: next.shareOptOut,
          sensitivePiLimit: next.sensitivePiLimit,
          gpcHeader: next.gpcHeader,
          gpcActive: next.gpcActive,
        },
      })),
    );
  }

  return next;
}

export function evaluateAndDescribeCalifornia(input: Parameters<typeof resolveCaliforniaOptOut>[0]) {
  const resolved = resolveCaliforniaOptOut(input);
  return {
    resolved,
    enforcement: californiaEnforcementFromRecord(resolved),
  };
}
