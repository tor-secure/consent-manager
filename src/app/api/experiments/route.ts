import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { experiments, experimentEvents } from "@/db/schema/experiments";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { consentPolicies } from "@/db/schema/consent-policies";
import { websites } from "@/db/schema/websites";
import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { roles } from "@/db/schema/roles";
import { requireOperatorRole } from "@/lib/org-roles";
import { parseExperimentVariants } from "@/lib/experiments/core";
import { experimentResults } from "@/lib/experiments/core";

const createSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().max(2000).default(""),
  websiteId: z.string().uuid(),
  policyVersionId: z.string().uuid(),
  controlVariantId: z.string().min(1).max(40),
  variants: z.array(z.unknown()).min(2).max(5),
  scheduledStartAt: z.string().datetime().optional(),
  scheduledEndAt: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  try {
    const context = await requireDashboardContext();
    const websiteId = new URL(request.url).searchParams.get("websiteId");
    const rows = await db.select().from(experiments).where(and(
      eq(experiments.organizationId, context.organization.id),
      ...(websiteId ? [eq(experiments.websiteId, websiteId)] : []),
    )).orderBy(desc(experiments.createdAt)).limit(100);
    const ids = rows.map((row) => row.id);
    const events = ids.length ? await db.select({ experimentId: experimentEvents.experimentId, variantId: experimentEvents.variantId, eventType: experimentEvents.eventType, choice: experimentEvents.choice, count: sql<number>`count(*)::int` }).from(experimentEvents).where(and(eq(experimentEvents.organizationId, context.organization.id), inArray(experimentEvents.experimentId, ids))).groupBy(experimentEvents.experimentId, experimentEvents.variantId, experimentEvents.eventType, experimentEvents.choice) : [];
    return NextResponse.json({ success: true, experiments: rows.map((row) => ({ ...row, results: experimentResults(events.filter((event) => event.experimentId === row.id), row.variants) })) });
  } catch {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireDashboardContext();
    const [role] = await db.select({ name: roles.name }).from(roles).where(eq(roles.id, context.membership.roleId)).limit(1);
    const roleError = requireOperatorRole(role?.name);
    if (roleError) return roleError;
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid experiment configuration" }, { status: 400 });
    const variants = parseExperimentVariants({ variants: parsed.data.variants, controlVariantId: parsed.data.controlVariantId });
    if (!variants) return NextResponse.json({ success: false, message: "Variants must have unique IDs, presentation-only changes, a control, and allocation totaling 100%" }, { status: 400 });
    const [version] = await db.select({ id: consentPolicyVersions.id }).from(consentPolicyVersions)
      .innerJoin(consentPolicies, eq(consentPolicies.id, consentPolicyVersions.policyId))
      .innerJoin(websites, eq(websites.id, consentPolicies.websiteId))
      .where(and(eq(consentPolicyVersions.id, parsed.data.policyVersionId), eq(consentPolicyVersions.isPublished, true), eq(websites.id, parsed.data.websiteId), eq(websites.organizationId, context.organization.id)))
      .limit(1);
    if (!version) return NextResponse.json({ success: false, message: "Published policy version not found for this site" }, { status: 404 });
    const [active] = await db.select({ id: experiments.id }).from(experiments).where(and(
      eq(experiments.organizationId, context.organization.id),
      eq(experiments.websiteId, parsed.data.websiteId),
      eq(experiments.policyVersionId, version.id),
      inArray(experiments.status, ["RUNNING", "SCHEDULED"]),
    )).limit(1);
    if (active) return NextResponse.json({ success: false, message: "An experiment is already running or scheduled for this site and policy version" }, { status: 409 });
    const scheduledStartAt = parsed.data.scheduledStartAt ? new Date(parsed.data.scheduledStartAt) : null;
    if (scheduledStartAt && scheduledStartAt.getTime() <= Date.now()) return NextResponse.json({ success: false, message: "Scheduled start must be in the future" }, { status: 400 });
    const scheduledEndAt = parsed.data.scheduledEndAt ? new Date(parsed.data.scheduledEndAt) : null;
    if (scheduledEndAt && (!scheduledStartAt || scheduledEndAt <= scheduledStartAt)) return NextResponse.json({ success: false, message: "Scheduled end must be after the scheduled start" }, { status: 400 });
    const [created] = await db.insert(experiments).values({
      organizationId: context.organization.id,
      websiteId: parsed.data.websiteId,
      policyVersionId: version.id,
      name: parsed.data.name,
      description: parsed.data.description,
      status: scheduledStartAt ? "SCHEDULED" : "DRAFT",
      variants: variants.variants,
      allocation: variants.allocation,
      controlVariantId: variants.controlVariantId,
      scheduledStartAt,
      scheduledEndAt,
      createdBy: context.user.id,
      updatedBy: context.user.id,
    }).returning();
    return NextResponse.json({ success: true, experiment: created }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, message: "Unable to create experiment" }, { status: 500 });
  }
}
