import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { experiments, experimentEvents } from "@/db/schema/experiments";
import { websites } from "@/db/schema/websites";
import { consentSessions } from "@/db/schema/consent-sessions";
import { privacyEvents } from "@/db/schema/privacy-events";
import { publicCorsHeaders, publicOptionsResponse, isValidSiteKey } from "@/lib/sdk/public-http";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit-store";
import { hashConsentSessionToken, consentSessionIsActive } from "@/lib/consent-session-core";
import { assignExperimentVariant } from "@/lib/experiments/core";
import { sdkOriginGuard } from "@/lib/sdk/origin-allowlist";

const headers = publicCorsHeaders("POST, OPTIONS");
const bodySchema = z.object({
  experimentId: z.string().uuid(),
  variantId: z.string().regex(/^[a-z0-9-]{1,40}$/),
  eventId: z.string().regex(/^[A-Za-z0-9_-]{12,80}$/),
  eventType: z.enum(["assignment", "impression", "interaction"]),
  visitorKey: z.string().regex(/^[A-Fa-f0-9]{16,128}$/),
  sessionToken: z.string().regex(/^[A-Za-z0-9_-]{40,128}$/).optional(),
}).strict();

export function OPTIONS() { return publicOptionsResponse("POST, OPTIONS"); }

export async function POST(request: Request, { params }: { params: Promise<{ siteKey: string }> }) {
  try {
    const { siteKey } = await params;
    if (!isValidSiteKey(siteKey)) return NextResponse.json({ success: false, message: "Invalid site key" }, { status: 400, headers });
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 4096) return NextResponse.json({ success: false, message: "Experiment event is too large" }, { status: 413, headers });
    const limit = await consumeRateLimit({ key: `experiment-event:${siteKey}:${getClientIp(request)}`, limit: 180, windowMs: 60_000 });
    if (!limit.allowed) return rateLimitResponse(limit, headers);
    const input = bodySchema.safeParse(await request.json());
    if (!input.success) return NextResponse.json({ success: false, message: "Invalid experiment event" }, { status: 400, headers });
    const [site] = await db.select({ id: websites.id, organizationId: websites.organizationId, domain: websites.domain, verified: websites.verified }).from(websites).where(and(eq(websites.siteKey, siteKey), eq(websites.status, "active"))).limit(1);
    if (!site) return NextResponse.json({ success: false, message: "Site not found" }, { status: 404, headers });
    const originError = sdkOriginGuard(request, site, headers);
    if (originError) return originError;
    const [experiment] = await db.select().from(experiments).where(and(eq(experiments.id, input.data.experimentId), eq(experiments.websiteId, site.id), eq(experiments.organizationId, site.organizationId), eq(experiments.status, "RUNNING"))).limit(1);
    if (!experiment || !experiment.variants.some((row) => row.id === input.data.variantId)) return NextResponse.json({ success: false, message: "Experiment assignment is no longer active" }, { status: 409, headers });
    const expectedVariant = assignExperimentVariant({ experimentId: experiment.id, visitorKey: input.data.visitorKey, variants: experiment.variants });
    if (!expectedVariant || expectedVariant.id !== input.data.variantId) return NextResponse.json({ success: false, message: "Variant does not match stable allocation" }, { status: 409, headers });
    const visitorHash = createHash("sha256").update(`${site.organizationId}:${site.id}:${experiment.id}:${input.data.visitorKey}`).digest("hex");
    let sessionId: string | null = null;
    if (input.data.sessionToken) {
      const [session] = await db.select().from(consentSessions).where(and(eq(consentSessions.tokenHash, hashConsentSessionToken(input.data.sessionToken)), eq(consentSessions.organizationId, site.organizationId), eq(consentSessions.websiteId, site.id))).limit(1);
      if (session && consentSessionIsActive(session)) sessionId = session.id;
    }
    const [inserted] = await db.insert(experimentEvents).values({
      organizationId: site.organizationId,
      websiteId: site.id,
      experimentId: experiment.id,
      sessionId,
      visitorHash,
      eventId: input.data.eventId,
      eventType: input.data.eventType,
      variantId: input.data.variantId,
    }).onConflictDoNothing().returning({ id: experimentEvents.id });
    if (inserted) {
      await db.insert(privacyEvents).values({
        organizationId: site.organizationId,
        websiteId: site.id,
        sessionId,
        eventType: "experiment.event",
        provenance: "observed",
        payload: { experimentId: experiment.id, eventType: input.data.eventType, variantId: input.data.variantId },
      });
    }
    return NextResponse.json({ success: true, duplicate: !inserted }, { headers });
  } catch {
    return NextResponse.json({ success: false, message: "Unable to record experiment event" }, { status: 500, headers });
  }
}
