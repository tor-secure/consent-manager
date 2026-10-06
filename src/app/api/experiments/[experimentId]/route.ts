import { and, desc, eq, ne, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { experimentEvents, experiments } from "@/db/schema/experiments";
import { privacyEvents } from "@/db/schema/privacy-events";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { consentPolicies } from "@/db/schema/consent-policies";
import { websites } from "@/db/schema/websites";
import { roles } from "@/db/schema/roles";
import { requireOperatorRole } from "@/lib/org-roles";
import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { canTransitionExperiment, EXPERIMENT_STATUSES, experimentResults, parseExperimentVariants } from "@/lib/experiments/core";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  description: z.string().max(2000).optional(),
  variants: z.array(z.unknown()).min(2).max(5).optional(),
  controlVariantId: z.string().max(40).optional(),
  status: z.enum(EXPERIMENT_STATUSES).optional(),
  scheduledStartAt: z.string().datetime().nullable().optional(),
  scheduledEndAt: z.string().datetime().nullable().optional(),
}).strict();

export async function GET(_request: Request, { params }: { params: Promise<{ experimentId: string }> }) {
  try {
    const context = await requireDashboardContext();
    const { experimentId } = await params;
    const [experiment] = await db.select().from(experiments).where(and(eq(experiments.id, experimentId), eq(experiments.organizationId, context.organization.id))).limit(1);
    if (!experiment) return NextResponse.json({ success: false, message: "Experiment not found" }, { status: 404 });
    const [events, aggregates] = await Promise.all([db.select({ id: experimentEvents.id, eventId: experimentEvents.eventId, eventType: experimentEvents.eventType, variantId: experimentEvents.variantId, choice: experimentEvents.choice, sessionId: experimentEvents.sessionId, occurredAt: experimentEvents.occurredAt }).from(experimentEvents)
      .where(and(eq(experimentEvents.experimentId, experiment.id), eq(experimentEvents.organizationId, context.organization.id)))
      .orderBy(desc(experimentEvents.occurredAt)).limit(200), db.select({ variantId: experimentEvents.variantId, eventType: experimentEvents.eventType, choice: experimentEvents.choice, count: sql<number>`count(*)::int` }).from(experimentEvents)
      .where(and(eq(experimentEvents.experimentId, experiment.id), eq(experimentEvents.organizationId, context.organization.id)))
      .groupBy(experimentEvents.variantId, experimentEvents.eventType, experimentEvents.choice)]);
    return NextResponse.json({ success: true, experiment, events, results: experimentResults(aggregates, experiment.variants) });
  } catch {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ experimentId: string }> }) {
  try {
    const context = await requireDashboardContext();
    const [role] = await db.select({ name: roles.name }).from(roles).where(eq(roles.id, context.membership.roleId)).limit(1);
    const roleError = requireOperatorRole(role?.name);
    if (roleError) return roleError;
    const { experimentId } = await params;
    const body = updateSchema.safeParse(await request.json());
    if (!body.success) return NextResponse.json({ success: false, message: "Invalid experiment update" }, { status: 400 });
    const [current] = await db.select().from(experiments).where(and(eq(experiments.id, experimentId), eq(experiments.organizationId, context.organization.id))).limit(1);
    if (!current) return NextResponse.json({ success: false, message: "Experiment not found" }, { status: 404 });
    const input = body.data;
    let variants = current.variants;
    let allocation = current.allocation;
    let controlVariantId = current.controlVariantId;
    if (input.variants) {
      if (["RUNNING", "COMPLETED", "ARCHIVED"].includes(current.status)) return NextResponse.json({ success: false, message: "Variants cannot change after the experiment has run" }, { status: 409 });
      const parsed = parseExperimentVariants({ variants: input.variants, controlVariantId: input.controlVariantId ?? current.controlVariantId });
      if (!parsed) return NextResponse.json({ success: false, message: "Variants must use presentation-only changes, include a control, and allocate exactly 100%" }, { status: 400 });
      ({ variants, allocation, controlVariantId } = parsed);
    } else if (input.controlVariantId && input.controlVariantId !== current.controlVariantId) {
      return NextResponse.json({ success: false, message: "A control variant change requires resubmitting all variants" }, { status: 400 });
    }
    const scheduledStartAt = input.scheduledStartAt === undefined ? current.scheduledStartAt : input.scheduledStartAt ? new Date(input.scheduledStartAt) : null;
    const scheduledEndAt = input.scheduledEndAt === undefined ? current.scheduledEndAt : input.scheduledEndAt ? new Date(input.scheduledEndAt) : null;
    if (scheduledStartAt && scheduledStartAt <= new Date() && current.status !== "RUNNING") return NextResponse.json({ success: false, message: "Scheduled start must be in the future" }, { status: 400 });
    if (scheduledEndAt && (!scheduledStartAt || scheduledEndAt <= scheduledStartAt)) return NextResponse.json({ success: false, message: "Scheduled end must be after start" }, { status: 400 });
    const nextStatus = input.status ?? current.status;
    if (nextStatus !== current.status && !canTransitionExperiment(current.status, nextStatus)) return NextResponse.json({ success: false, message: `Cannot transition ${current.status} to ${nextStatus}` }, { status: 409 });
    if (nextStatus === "SCHEDULED" && !scheduledStartAt) return NextResponse.json({ success: false, message: "A future start time is required to schedule" }, { status: 400 });
    if (nextStatus === "RUNNING") {
      const [published] = await db.select({ id: consentPolicyVersions.id }).from(consentPolicyVersions)
        .innerJoin(consentPolicies, eq(consentPolicyVersions.policyId, consentPolicies.id))
        .innerJoin(websites, eq(consentPolicies.websiteId, websites.id))
        .where(and(eq(consentPolicyVersions.id, current.policyVersionId), eq(consentPolicyVersions.isPublished, true), eq(websites.id, current.websiteId), eq(websites.organizationId, context.organization.id))).limit(1);
      if (!published) return NextResponse.json({ success: false, message: "The experiment policy version is no longer published" }, { status: 409 });
      const [otherRunning] = await db.select({ id: experiments.id }).from(experiments).where(and(eq(experiments.organizationId, context.organization.id), eq(experiments.websiteId, current.websiteId), eq(experiments.policyVersionId, current.policyVersionId), eq(experiments.status, "RUNNING"), ne(experiments.id, current.id))).limit(1);
      if (otherRunning) return NextResponse.json({ success: false, message: "Another experiment is already running for this site and policy version" }, { status: 409 });
    }
    const now = new Date();
    const values = {
      name: input.name ?? current.name,
      description: input.description ?? current.description,
      variants,
      allocation,
      controlVariantId,
      status: nextStatus,
      scheduledStartAt,
      scheduledEndAt,
      startedAt: nextStatus === "RUNNING" ? current.startedAt ?? now : current.startedAt,
      endedAt: nextStatus === "COMPLETED" || nextStatus === "ARCHIVED" ? current.endedAt ?? now : current.endedAt,
      updatedBy: context.user.id,
      updatedAt: now,
    };
    const [updated] = await db.update(experiments).set(values).where(and(eq(experiments.id, current.id), eq(experiments.organizationId, context.organization.id), eq(experiments.status, current.status))).returning();
    if (!updated) return NextResponse.json({ success: false, message: "Experiment changed; refresh and retry" }, { status: 409 });
    if (nextStatus !== current.status) {
      if (nextStatus === "COMPLETED") {
        await db.insert(experimentEvents).values({ organizationId: current.organizationId, websiteId: current.websiteId, experimentId: current.id, eventId: `${current.id}-completion`, eventType: "completion", variantId: current.controlVariantId, occurredAt: now }).onConflictDoNothing();
      }
      await db.insert(privacyEvents).values({
        organizationId: context.organization.id,
        websiteId: current.websiteId,
        eventType: nextStatus === "COMPLETED" ? "experiment.completed" : "experiment.status_changed",
        provenance: "configured",
        payload: { experimentId: current.id, from: current.status, to: nextStatus },
        occurredAt: now,
      });
    }
    return NextResponse.json({ success: true, experiment: updated });
  } catch {
    return NextResponse.json({ success: false, message: "Unable to update experiment" }, { status: 500 });
  }
}
