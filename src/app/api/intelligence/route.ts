import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { intelligenceRuns } from "@/db/schema/intelligence";
import { websites } from "@/db/schema/websites";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { loadQualityScoreInput } from "@/lib/monitoring/privacy-intelligence";
import { calculateConsentQualityScore } from "@/lib/monitoring/consent-quality";
import { buildAutopilotPlan } from "@/lib/intelligence/autopilot-engine";
import { buildConsentNegotiationPlan } from "@/lib/intelligence/negotiation-engine";
import { simulatePrivacyImpact } from "@/lib/intelligence/simulator";
import { computeConsentRoi } from "@/lib/roi/roi-engine";
import { createAutopilotPlan, runAuditedIntelligence } from "@/lib/intelligence/service";
import { roiConfigurations } from "@/db/schema/intelligence";
import { loadConsentAnalytics } from "@/lib/analytics/queries";

const requestSchema = z.object({
  websiteId: z.string().uuid(),
  engine: z.enum(["autopilot", "digital_twin", "roi", "negotiation"]),
  targetScore: z.number().int().min(0).max(100).optional(),
});

async function context() {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId || !session.orgId) return null;
  const [user, organization] = await Promise.all([
    resolveLocalUser(session.userId),
    resolveLocalOrganization(session.orgId),
  ]);
  if (!user || !organization || !(await resolveActiveMembership(organization.id, user.id))) return null;
  return { user, organization, session };
}

export async function GET(request: Request) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const websiteId = new URL(request.url).searchParams.get("websiteId");
  if (!websiteId || !z.string().uuid().safeParse(websiteId).success) {
    return NextResponse.json({ success: false, message: "Valid websiteId is required" }, { status: 400 });
  }
  const rows = await db
    .select()
    .from(intelligenceRuns)
    .where(and(eq(intelligenceRuns.organizationId, ctx.organization.id), eq(intelligenceRuns.websiteId, websiteId)))
    .orderBy(desc(intelligenceRuns.createdAt))
    .limit(50);
  return NextResponse.json({ success: true, runs: rows });
}

export async function POST(request: Request) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const limit = rateLimit({
    key: `intelligence:${ctx.organization.id}:${ctx.user.id}:${getClientIp(request)}`,
    limit: 20,
    windowMs: 60 * 60_000,
  });
  if (!limit.allowed) return rateLimitResponse(limit);

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
  const [site] = await db
    .select({ id: websites.id })
    .from(websites)
    .where(and(eq(websites.id, parsed.data.websiteId), eq(websites.organizationId, ctx.organization.id)))
    .limit(1);
  if (!site) return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });

  const loaded = await loadQualityScoreInput(site.id);
  if (!loaded) return NextResponse.json({ success: false, message: "Quality inputs unavailable" }, { status: 409 });
  const baseline = calculateConsentQualityScore(loaded.input);
  const scenarios = simulatePrivacyImpact(loaded.input);
  const [roiConfig, analytics] =
    parsed.data.engine === "roi"
      ? await Promise.all([
          db
            .select()
            .from(roiConfigurations)
            .where(
              and(
                eq(roiConfigurations.organizationId, ctx.organization.id),
                eq(roiConfigurations.websiteId, site.id),
              ),
            )
            .limit(1)
            .then((rows) => rows[0] ?? null),
          loadConsentAnalytics(ctx.organization.id, { websiteId: site.id, days: "30" }),
        ])
      : [null, null];
  const deterministicOutput =
    parsed.data.engine === "autopilot"
      ? buildAutopilotPlan(loaded.input)
      : parsed.data.engine === "negotiation"
        ? buildConsentNegotiationPlan({
            baselineScore: baseline.overall,
            targetScore: parsed.data.targetScore ?? 85,
            scenarios,
            qualityInput: loaded.input,
          })
        : parsed.data.engine === "roi"
          ? computeConsentRoi({
              baseline: baseline.overall,
              targetScore: roiConfig?.targetScore,
              scenarios,
              business: {
                monthlySessions: roiConfig?.monthlySessions,
                valuePerConversion: roiConfig?.valuePerConversion,
                valuePerConsent: roiConfig?.valuePerConsent,
                implementationCost: roiConfig?.implementationCost,
                recurringMonthlyCost: roiConfig?.recurringMonthlyCost,
                currency: roiConfig?.currency,
                measuredConsentRate: analytics?.overview.consentRate,
                measuredDecisionCount: analytics?.overview.total,
              },
            })
          : { baseline, scenarios };
  const persistedPlan =
    parsed.data.engine === "autopilot"
      ? await createAutopilotPlan({
          organizationId: ctx.organization.id,
          websiteId: site.id,
          actorUserId: ctx.user.id,
          qualityInput: loaded.input,
        })
      : null;

  const run = await runAuditedIntelligence({
    organizationId: ctx.organization.id,
    websiteId: site.id,
    actorUserId: ctx.user.id,
    engine: parsed.data.engine,
    aggregateContext: {
      qualityScore: baseline.overall,
      openFindingCount: loaded.openFindingCount,
      scenarioCount: scenarios.length,
      targetScore: parsed.data.targetScore ?? null,
    },
    deterministicOutput,
  });
  return NextResponse.json({ success: true, run, plan: persistedPlan }, { status: 201 });
}
