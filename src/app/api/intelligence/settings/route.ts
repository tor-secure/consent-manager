import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import { negotiationConfigurations, roiConfigurations } from "@/db/schema/intelligence";
import { websites } from "@/db/schema/websites";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import { negotiationOfferSchema, publicNegotiationOffers } from "@/lib/intelligence/negotiation-offers";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const roiSchema = z.object({
  kind: z.literal("roi"),
  websiteId: z.string().uuid(),
  monthlySessions: z.number().int().nonnegative().nullable(),
  valuePerConversion: z.number().nonnegative().nullable(),
  valuePerConsent: z.number().nonnegative().nullable(),
  implementationCost: z.number().nonnegative().nullable(),
  recurringMonthlyCost: z.number().nonnegative().nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  targetScore: z.number().int().min(0).max(100),
});
const negotiationSchema = z.object({
  kind: z.literal("negotiation"),
  websiteId: z.string().uuid(),
  enabled: z.boolean(),
  offers: z.array(negotiationOfferSchema).max(5),
});
const bodySchema = z.discriminatedUnion("kind", [roiSchema, negotiationSchema]);

async function context() {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId || !session.orgId) return null;
  const [user, organization] = await Promise.all([
    resolveLocalUser(session.userId),
    resolveLocalOrganization(session.orgId),
  ]);
  if (!user || !organization || !(await resolveActiveMembership(organization.id, user.id))) return null;
  return { user, organization };
}

export async function GET(request: Request) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const websiteId = new URL(request.url).searchParams.get("websiteId");
  if (!websiteId || !z.string().uuid().safeParse(websiteId).success) {
    return NextResponse.json({ success: false, message: "Valid websiteId is required" }, { status: 400 });
  }
  const [roi, negotiation] = await Promise.all([
    db.select().from(roiConfigurations).where(and(eq(roiConfigurations.organizationId, ctx.organization.id), eq(roiConfigurations.websiteId, websiteId))).limit(1),
    db.select().from(negotiationConfigurations).where(and(eq(negotiationConfigurations.organizationId, ctx.organization.id), eq(negotiationConfigurations.websiteId, websiteId))).limit(1),
  ]);
  return NextResponse.json({ success: true, roi: roi[0] ?? null, negotiation: negotiation[0] ?? null });
}

export async function PUT(request: Request) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const limit = rateLimit({
    key: `intelligence-settings:${ctx.organization.id}:${ctx.user.id}:${getClientIp(request)}`,
    limit: 30,
    windowMs: 60 * 60_000,
  });
  if (!limit.allowed) return rateLimitResponse(limit);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid settings" }, { status: 400 });
  const [site] = await db.select({ id: websites.id }).from(websites).where(and(eq(websites.id, parsed.data.websiteId), eq(websites.organizationId, ctx.organization.id))).limit(1);
  if (!site) return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });

  if (parsed.data.kind === "roi") {
    const { kind: _, ...values } = parsed.data;
    void _;
    await db
      .insert(roiConfigurations)
      .values({ ...values, organizationId: ctx.organization.id, updatedByUserId: ctx.user.id })
      .onConflictDoUpdate({
        target: [roiConfigurations.organizationId, roiConfigurations.websiteId],
        set: { ...values, updatedByUserId: ctx.user.id, updatedAt: new Date() },
      });
  } else {
    const safeOffers = publicNegotiationOffers({
      enabled: true,
      offers: parsed.data.offers,
      requiredPurposeKeys: [],
    });
    await db
      .insert(negotiationConfigurations)
      .values({
        organizationId: ctx.organization.id,
        websiteId: parsed.data.websiteId,
        enabled: parsed.data.enabled,
        offers: safeOffers,
        updatedByUserId: ctx.user.id,
      })
      .onConflictDoUpdate({
        target: negotiationConfigurations.websiteId,
        set: { enabled: parsed.data.enabled, offers: safeOffers, updatedByUserId: ctx.user.id, updatedAt: new Date() },
      });
  }
  await db.insert(auditLogs).values({
    organizationId: ctx.organization.id,
    userId: ctx.user.id,
    action: `intelligence.${parsed.data.kind}.settings_updated`,
    resourceType: "website",
    resourceId: site.id,
    metadata: { kind: parsed.data.kind },
  });
  return NextResponse.json({ success: true });
}
