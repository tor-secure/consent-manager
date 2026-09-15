import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import { autopilotPlans } from "@/db/schema/intelligence";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import {
  applyAutopilotStep,
  restoreWebsiteTrackers,
  snapshotWebsiteTrackers,
  type AutopilotRollbackState,
} from "@/lib/intelligence/autopilot-apply";
import { requireOperatorRole } from "@/lib/org-roles";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const actionSchema = z.object({
  action: z.enum(["approve", "apply", "rollback"]),
  confirmed: z.literal(true),
  stepId: z.string().optional(),
});
const persistedPlanSchema = z.object({
  steps: z.array(z.object({
    id: z.string(),
    applyMode: z.enum(["operator_navigation", "operator_approval"]),
    reversible: z.boolean(),
    legalPublication: z.boolean(),
  })),
  appliedStepIds: z.array(z.string()).optional(),
}).passthrough();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId || !session.orgId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const [user, organization] = await Promise.all([
    resolveLocalUser(session.userId),
    resolveLocalOrganization(session.orgId),
  ]);
  if (!user || !organization) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  const membership = await resolveActiveMembership(organization.id, user.id);
  if (!membership) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  const operatorError = requireOperatorRole(membership.roleName);
  if (operatorError) return operatorError;
  const limit = rateLimit({
    key: `autopilot-action:${organization.id}:${user.id}:${getClientIp(request)}`,
    limit: 30,
    windowMs: 60 * 60_000,
  });
  if (!limit.allowed) return rateLimitResponse(limit);
  const body = actionSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ success: false, message: "Explicit confirmation is required" }, { status: 400 });
  const { id } = await params;
  const [current] = await db
    .select()
    .from(autopilotPlans)
    .where(and(eq(autopilotPlans.id, id), eq(autopilotPlans.organizationId, organization.id)))
    .limit(1);
  if (!current) return NextResponse.json({ success: false, message: "Plan not found" }, { status: 404 });

  if (body.data.action === "apply" && current.status !== "approved") {
    return NextResponse.json({ success: false, message: "Plan must be approved before apply" }, { status: 409 });
  }
  const parsedPlan = persistedPlanSchema.safeParse(current.plan);
  if (body.data.action === "apply") {
    const step = parsedPlan.success
      ? parsedPlan.data.steps.find((item) => item.id === body.data.stepId)
      : null;
    if (!step || step.applyMode !== "operator_approval" || !step.reversible || step.legalPublication) {
      return NextResponse.json({ success: false, message: "Only an approved safe reversible step may be applied" }, { status: 422 });
    }
    const before = await snapshotWebsiteTrackers(current.websiteId);
    const applied = await applyAutopilotStep({
      organizationId: organization.id,
      websiteId: current.websiteId,
      confirmed: true,
      step: {
        id: step.id as "map_unclassified" | "complete_coverage",
        title: step.id,
        description: "",
        before: 0,
        after: 0,
        delta: 0,
        applyMode: step.applyMode,
        reversible: step.reversible,
        legalPublication: step.legalPublication,
      },
    });
    if (!applied.applied) {
      return NextResponse.json({ success: false, message: applied.message }, { status: 422 });
    }
    const nextPlan = parsedPlan.success
      ? {
          ...parsedPlan.data,
          appliedStepIds: [...new Set([...(parsedPlan.data.appliedStepIds ?? []), body.data.stepId!])],
        }
      : current.plan;
    const [updated] = await db
      .update(autopilotPlans)
      .set({
        status: "partially_applied",
        version: current.version + 1,
        rollbackState: before,
        plan: nextPlan,
        updatedAt: new Date(),
      })
      .where(eq(autopilotPlans.id, current.id))
      .returning();
    await db.insert(auditLogs).values({
      organizationId: organization.id,
      userId: user.id,
      action: "autopilot.plan.apply",
      resourceType: "autopilot_plan",
      resourceId: current.id,
      metadata: { mutated: applied.mutated, stepId: body.data.stepId, fromVersion: current.version },
    });
    return NextResponse.json({ success: true, plan: updated, apply: applied });
  }

  if (body.data.action === "rollback") {
    if (!current.rollbackState) {
      return NextResponse.json({ success: false, message: "No rollback state is available" }, { status: 409 });
    }
    await restoreWebsiteTrackers(current.rollbackState as AutopilotRollbackState);
    const [updated] = await db
      .update(autopilotPlans)
      .set({
        status: "rolled_back",
        version: current.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(autopilotPlans.id, current.id))
      .returning();
    await db.insert(auditLogs).values({
      organizationId: organization.id,
      userId: user.id,
      action: "autopilot.plan.rollback",
      resourceType: "autopilot_plan",
      resourceId: current.id,
      metadata: { fromVersion: current.version },
    });
    return NextResponse.json({ success: true, plan: updated });
  }

  const [updated] = await db
    .update(autopilotPlans)
    .set({
      status: "approved",
      version: current.version + 1,
      rollbackState: { status: current.status, version: current.version, plan: current.plan },
      updatedAt: new Date(),
    })
    .where(eq(autopilotPlans.id, current.id))
    .returning();
  await db.insert(auditLogs).values({
    organizationId: organization.id,
    userId: user.id,
    action: "autopilot.plan.approve",
    resourceType: "autopilot_plan",
    resourceId: current.id,
    metadata: { fromVersion: current.version, toVersion: updated.version, confirmed: true },
  });
  return NextResponse.json({ success: true, plan: updated });
}
