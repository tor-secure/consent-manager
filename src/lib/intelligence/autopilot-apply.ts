import "server-only";

import { and, eq, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { purposes } from "@/db/schema/purposes";
import { scanResults } from "@/db/schema/scan-results";
import { trackers } from "@/db/schema/trackers";
import { vendors } from "@/db/schema/vendors";
import { type AutopilotStep, mayApplyAutopilotStep } from "@/lib/intelligence/autopilot-engine";

export type TrackerRollbackRow = {
  id: string;
  purposeId: string | null;
  vendorId: string | null;
  scannerClassification: string;
};

export type AutopilotRollbackState = {
  websiteId: string;
  trackers: TrackerRollbackRow[];
};

export async function snapshotWebsiteTrackers(websiteId: string): Promise<AutopilotRollbackState> {
  const rows = await db
    .select({
      id: trackers.id,
      purposeId: trackers.purposeId,
      vendorId: trackers.vendorId,
      scannerClassification: trackers.scannerClassification,
    })
    .from(trackers)
    .where(eq(trackers.websiteId, websiteId));
  return { websiteId, trackers: rows };
}

export async function restoreWebsiteTrackers(state: AutopilotRollbackState) {
  for (const row of state.trackers) {
    await db
      .update(trackers)
      .set({
        purposeId: row.purposeId,
        vendorId: row.vendorId,
        scannerClassification: row.scannerClassification,
        updatedAt: new Date(),
      })
      .where(and(eq(trackers.id, row.id), eq(trackers.websiteId, state.websiteId)));
  }
}

export async function applyAutopilotStep(input: {
  organizationId: string;
  websiteId: string;
  step: AutopilotStep;
  confirmed: boolean;
}): Promise<{ applied: boolean; mutated: number; message: string }> {
  if (!mayApplyAutopilotStep(input.step, input.confirmed)) {
    return { applied: false, mutated: 0, message: "Step is not a confirmed reversible mutation" };
  }
  if (input.step.id === "map_unclassified") {
    const mutated = await mapUnclassifiedTrackers(input.organizationId, input.websiteId);
    return { applied: true, mutated, message: `Mapped ${mutated} unclassified tracker(s)` };
  }
  if (input.step.id === "complete_coverage") {
    const mutated = await coverUnmatchedScanItems(input.websiteId);
    return { applied: true, mutated, message: `Created ${mutated} tracker record(s) from scan items` };
  }
  return { applied: false, mutated: 0, message: "Step is advisory only" };
}

async function mapUnclassifiedTrackers(organizationId: string, websiteId: string) {
  const [purpose] = await db
    .select({ id: purposes.id })
    .from(purposes)
    .where(and(eq(purposes.organizationId, organizationId), eq(purposes.status, "active")))
    .limit(1);
  const [vendor] = await db
    .select({ id: vendors.id })
    .from(vendors)
    .where(and(eq(vendors.organizationId, organizationId), eq(vendors.status, "active")))
    .limit(1);
  if (!purpose || !vendor) return 0;
  const unclassified = await db
    .select({ id: trackers.id })
    .from(trackers)
    .where(
      and(
        eq(trackers.websiteId, websiteId),
        eq(trackers.status, "active"),
        eq(trackers.isEssential, false),
        or(isNull(trackers.purposeId), isNull(trackers.vendorId)),
      ),
    );
  for (const row of unclassified) {
    await db
      .update(trackers)
      .set({
        purposeId: purpose.id,
        vendorId: vendor.id,
        scannerClassification: "mapped",
        updatedAt: new Date(),
      })
      .where(eq(trackers.id, row.id));
  }
  return unclassified.length;
}

async function coverUnmatchedScanItems(websiteId: string) {
  const existing = await db
    .select({ domain: trackers.domain, identifier: trackers.identifier })
    .from(trackers)
    .where(eq(trackers.websiteId, websiteId));
  const known = new Set(
    existing.flatMap((row) => [row.domain, row.identifier].filter(Boolean).map((value) => String(value).toLowerCase())),
  );
  const items = await db
    .select({
      id: scanResults.id,
      name: scanResults.name,
      domain: scanResults.domain,
      type: scanResults.type,
    })
    .from(scanResults)
    .where(eq(scanResults.websiteId, websiteId))
    .limit(200);
  let created = 0;
  for (const item of items) {
    const key = (item.domain || item.name || "").toLowerCase();
    if (!key || known.has(key)) continue;
    await db.insert(trackers).values({
      websiteId,
      name: item.name || item.domain || "Scan tracker",
      type: item.type || "script",
      domain: item.domain,
      identifier: item.domain,
      status: "active",
      isEssential: false,
      scannerClassification: "unmapped",
    });
    known.add(key);
    created += 1;
  }
  return created;
}
