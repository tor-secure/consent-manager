import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  autopilotPlans,
  digitalTwinSnapshots,
  intelligenceRuns,
} from "@/db/schema/intelligence";
import { auditLogs } from "@/db/schema/audit-logs";
import {
  enrichDeterministicOutput,
  fingerprintIntelligenceInput,
} from "@/lib/ai/intelligence";
import type { AiProvider } from "@/lib/ai/types";
import type { ConsentQualityInput } from "@/lib/monitoring/consent-quality";
import type { ConsentGraphSnapshot } from "./graph-model";
import { buildAutopilotPlan } from "./autopilot-engine";

export async function runAuditedIntelligence(input: {
  organizationId: string;
  websiteId?: string;
  actorUserId?: string;
  engine: string;
  aggregateContext: Record<string, unknown>;
  deterministicOutput: unknown;
  provider?: AiProvider;
}) {
  const inputFingerprint = fingerprintIntelligenceInput({
    engine: input.engine,
    aggregateContext: input.aggregateContext,
    deterministicOutput: input.deterministicOutput,
  });
  const enrichment = await enrichDeterministicOutput({
    engine: input.engine,
    aggregateContext: input.aggregateContext,
    deterministicOutput: input.deterministicOutput,
    provider: input.provider,
  });
  const [run] = await db
    .insert(intelligenceRuns)
    .values({
      organizationId: input.organizationId,
      websiteId: input.websiteId,
      actorUserId: input.actorUserId,
      engine: input.engine,
      inputFingerprint,
      provider: enrichment.provider,
      providerModel: enrichment.model,
      fallback: enrichment.fallback,
      deterministicOutput: input.deterministicOutput,
      aiEnrichment: enrichment.value,
      usage: enrichment.usage,
    })
    .returning();
  await db.insert(auditLogs).values({
    organizationId: input.organizationId,
    userId: input.actorUserId,
    action: "intelligence.run",
    resourceType: "intelligence_run",
    resourceId: run.id,
    description: `${input.engine} advisory intelligence generated`,
    metadata: { websiteId: input.websiteId, provider: enrichment.provider, fallback: enrichment.fallback },
  });
  return run;
}

export async function captureDigitalTwinSnapshot(input: {
  organizationId: string;
  websiteId: string;
  source: "scan" | "policy" | "manual";
  sourceId?: string;
  actorUserId?: string;
  graph: ConsentGraphSnapshot;
  qualityInput: ConsentQualityInput;
  qualityScore: number;
}) {
  const payload = { graph: input.graph, qualityInput: input.qualityInput };
  const graphHash = fingerprintIntelligenceInput(payload);
  const [snapshot] = await db
    .insert(digitalTwinSnapshots)
    .values({
      organizationId: input.organizationId,
      websiteId: input.websiteId,
      source: input.source,
      sourceId: input.sourceId,
      graphHash,
      qualityScore: input.qualityScore,
      inputPayload: payload,
      createdByUserId: input.actorUserId,
    })
    .onConflictDoNothing()
    .returning();
  return snapshot ?? null;
}

export async function listDigitalTwinSnapshots(organizationId: string, websiteId: string) {
  return db
    .select()
    .from(digitalTwinSnapshots)
    .where(
      and(
        eq(digitalTwinSnapshots.organizationId, organizationId),
        eq(digitalTwinSnapshots.websiteId, websiteId),
      ),
    )
    .orderBy(desc(digitalTwinSnapshots.createdAt));
}

export function diffTwinPayloads(before: unknown, after: unknown) {
  const left = (before ?? {}) as Record<string, unknown>;
  const right = (after ?? {}) as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
  return keys
    .filter((key) => fingerprintIntelligenceInput(left[key]) !== fingerprintIntelligenceInput(right[key]))
    .map((key) => ({ key, before: left[key] ?? null, after: right[key] ?? null }));
}

export async function createAutopilotPlan(input: {
  organizationId: string;
  websiteId: string;
  actorUserId?: string;
  qualityInput: ConsentQualityInput;
}) {
  const plan = buildAutopilotPlan(input.qualityInput);
  const [created] = await db
    .insert(autopilotPlans)
    .values({
      organizationId: input.organizationId,
      websiteId: input.websiteId,
      createdByUserId: input.actorUserId,
      baselineFingerprint: fingerprintIntelligenceInput(input.qualityInput),
      plan,
    })
    .returning();
  await db.insert(auditLogs).values({
    organizationId: input.organizationId,
    userId: input.actorUserId,
    action: "autopilot.plan.created",
    resourceType: "autopilot_plan",
    resourceId: created.id,
    metadata: { websiteId: input.websiteId, version: created.version },
  });
  return created;
}
