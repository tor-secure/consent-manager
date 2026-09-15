import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { loadConsentGraph } from "@/lib/intelligence/graph-snapshot";
import { requireOperatorRole } from "@/lib/org-roles";
import {
  captureDigitalTwinSnapshot,
  diffTwinPayloads,
  listDigitalTwinSnapshots,
  restoreDigitalTwinSnapshot,
} from "@/lib/intelligence/service";
import { simulateCumulativeImpact } from "@/lib/intelligence/simulator";
import { loadQualityScoreInput } from "@/lib/monitoring/privacy-intelligence";
import { calculateConsentQualityScore } from "@/lib/monitoring/consent-quality";

async function context() {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId || !session.orgId) return null;
  const [user, organization] = await Promise.all([
    resolveLocalUser(session.userId),
    resolveLocalOrganization(session.orgId),
  ]);
  const membership = user && organization ? await resolveActiveMembership(organization.id, user.id) : null;
  if (!user || !organization || !membership) return null;
  return { user, organization, membership };
}

export async function GET(request: Request) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const websiteId = url.searchParams.get("websiteId");
  if (!websiteId || !z.string().uuid().safeParse(websiteId).success) {
    return NextResponse.json({ success: false, message: "Valid websiteId is required" }, { status: 400 });
  }
  const snapshots = await listDigitalTwinSnapshots(ctx.organization.id, websiteId);
  const before = url.searchParams.get("before");
  const after = url.searchParams.get("after");
  const left = snapshots.find((row) => row.id === before);
  const right = snapshots.find((row) => row.id === after);
  return NextResponse.json({
    success: true,
    snapshots,
    diff: left && right ? diffTwinPayloads(left.inputPayload, right.inputPayload) : null,
  });
}

export async function POST(request: Request) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const limit = rateLimit({
    key: `digital-twin:${ctx.organization.id}:${ctx.user.id}:${getClientIp(request)}`,
    limit: 30,
    windowMs: 60 * 60_000,
  });
  if (!limit.allowed) return rateLimitResponse(limit);
  const parsed = z
    .object({
      websiteId: z.string().uuid(),
      action: z.enum(["simulate", "restore"]).default("simulate"),
      snapshotId: z.string().uuid().optional(),
      scenarioIds: z
        .array(z.enum(["map_unclassified", "resolve_findings", "publish_policy", "complete_coverage"]))
        .max(4)
        .default([]),
      capture: z.boolean().default(false),
    })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });

  if (parsed.data.action === "restore") {
    const operatorError = requireOperatorRole(ctx.membership.roleName);
    if (operatorError) return operatorError;
    if (!parsed.data.snapshotId) {
      return NextResponse.json({ success: false, message: "snapshotId is required" }, { status: 400 });
    }
    const restored = await restoreDigitalTwinSnapshot({
      organizationId: ctx.organization.id,
      websiteId: parsed.data.websiteId,
      snapshotId: parsed.data.snapshotId,
      actorUserId: ctx.user.id,
    });
    if (!restored.ok) return NextResponse.json({ success: false, message: restored.message }, { status: 404 });
    return NextResponse.json({ success: true, restore: restored, publishesPolicy: false });
  }

  const [graph, loaded] = await Promise.all([
    loadConsentGraph(ctx.organization.id, parsed.data.websiteId),
    loadQualityScoreInput(parsed.data.websiteId),
  ]);
  if (!graph || !loaded) return NextResponse.json({ success: false, message: "Twin inputs unavailable" }, { status: 404 });
  const simulation = simulateCumulativeImpact(loaded.input, parsed.data.scenarioIds);
  const snapshot = parsed.data.capture
    ? await captureDigitalTwinSnapshot({
        organizationId: ctx.organization.id,
        websiteId: parsed.data.websiteId,
        source: "manual",
        actorUserId: ctx.user.id,
        graph,
        qualityInput: loaded.input,
        qualityScore: calculateConsentQualityScore(loaded.input).overall,
      })
    : null;
  return NextResponse.json({ success: true, simulation, snapshot }, { status: snapshot ? 201 : 200 });
}
