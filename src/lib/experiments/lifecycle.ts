import "server-only";
import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { experimentEvents, experiments } from "@/db/schema/experiments";
import { privacyEvents } from "@/db/schema/privacy-events";

export async function promoteDueExperiments(now = new Date(), scope?: { websiteId?: string; policyVersionId?: string }) {
  const scopeFilters = [
    ...(scope?.websiteId ? [eq(experiments.websiteId, scope.websiteId)] : []),
    ...(scope?.policyVersionId ? [eq(experiments.policyVersionId, scope.policyVersionId)] : []),
  ];
  const ended = await db.select().from(experiments).where(and(eq(experiments.status, "RUNNING"), lte(experiments.scheduledEndAt, now), ...scopeFilters));
  let completed = 0;
  for (const row of ended) {
    const [updated] = await db.update(experiments).set({ status: "COMPLETED", endedAt: now, updatedAt: now }).where(and(eq(experiments.id, row.id), eq(experiments.status, "RUNNING"))).returning({ id: experiments.id });
    if (!updated) continue;
    completed++;
    await db.insert(experimentEvents).values({ organizationId: row.organizationId, websiteId: row.websiteId, experimentId: row.id, eventId: `${row.id}-completion`, eventType: "completion", variantId: row.controlVariantId, occurredAt: now });
    await db.insert(privacyEvents).values({ organizationId: row.organizationId, websiteId: row.websiteId, eventType: "experiment.completed", provenance: "configured", payload: { experimentId: row.id, reason: "scheduled_end" }, occurredAt: now });
  }
  const missedSchedules = await db.select().from(experiments).where(and(eq(experiments.status, "SCHEDULED"), lte(experiments.scheduledEndAt, now), ...scopeFilters));
  for (const row of missedSchedules) {
    const [updated] = await db.update(experiments).set({ status: "COMPLETED", endedAt: row.scheduledEndAt ?? now, updatedAt: now }).where(and(eq(experiments.id, row.id), eq(experiments.status, "SCHEDULED"))).returning({ id: experiments.id });
    if (updated) {
      completed++;
      await db.insert(privacyEvents).values({ organizationId: row.organizationId, websiteId: row.websiteId, eventType: "experiment.completed", provenance: "configured", payload: { experimentId: row.id, reason: "schedule_window_missed" }, occurredAt: now });
    }
  }
  const due = await db.select().from(experiments).where(and(eq(experiments.status, "SCHEDULED"), lte(experiments.scheduledStartAt, now), or(isNull(experiments.scheduledEndAt), gt(experiments.scheduledEndAt, now)), ...scopeFilters));
  let started = 0;
  for (const row of due) {
    const running = await db.select({ id: experiments.id }).from(experiments).where(and(eq(experiments.websiteId, row.websiteId), eq(experiments.policyVersionId, row.policyVersionId), eq(experiments.status, "RUNNING"))).limit(1);
    if (running.length) continue;
    try {
      const [updated] = await db.update(experiments).set({ status: "RUNNING", startedAt: now, updatedAt: now }).where(and(eq(experiments.id, row.id), eq(experiments.status, "SCHEDULED"))).returning({ id: experiments.id });
      if (!updated) continue;
      started++;
      await db.insert(privacyEvents).values({ organizationId: row.organizationId, websiteId: row.websiteId, eventType: "experiment.status_changed", provenance: "configured", payload: { experimentId: row.id, from: "SCHEDULED", to: "RUNNING" }, occurredAt: now });
    } catch {
      // A concurrent start for the same site and policy version wins the unique index.
    }
  }
  return { started, completed };
}
