import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { privacyEvents } from "@/db/schema/privacy-events";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit-store";
import { logger } from "@/lib/logger";
import { publicCorsHeaders, publicOptionsResponse, isValidSiteKey, readPublicJsonObject } from "@/lib/sdk/public-http";
import { sdkOriginGuard } from "@/lib/sdk/origin-allowlist";
import { recordRuntimeDiscovery, runtimeDiscoveryBatchSchema } from "@/lib/runtime-discovery";

export async function POST(request: Request, { params }: { params: Promise<{ siteKey: string }> }) {
  const headers = publicCorsHeaders("POST, OPTIONS");
  const { siteKey } = await params;
  const key = siteKey?.trim() ?? "";
  const limit = await consumeRateLimit({ key: `runtime-discovery:${getClientIp(request)}:${key || "invalid"}`, limit: 120, windowMs: 60_000 });
  if (!limit.allowed) return rateLimitResponse(limit, headers);
  if (!isValidSiteKey(key)) return NextResponse.json({ success: false, message: "Invalid site key" }, { status: 400, headers });
  const [site] = await db.select({ id: websites.id, organizationId: websites.organizationId, domain: websites.domain, verified: websites.verified })
    .from(websites).where(and(eq(websites.siteKey, key), eq(websites.status, "active"))).limit(1);
  if (!site) return NextResponse.json({ success: false, message: "Website not found" }, { status: 404, headers });
  const originError = sdkOriginGuard(request, site, headers);
  if (originError) return originError;
  const input = await readPublicJsonObject(request);
  if (!input.ok) return NextResponse.json({ success: false, message: input.message }, { status: input.status, headers });
  const parsed = runtimeDiscoveryBatchSchema.safeParse(input.body);
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid discovery observations", issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) }, { status: 400, headers });
  try {
    const result = await recordRuntimeDiscovery(site.organizationId, site.id, parsed.data);
    if (result.accepted > 0) await db.insert(privacyEvents).values({ organizationId: site.organizationId, websiteId: site.id, eventType: "runtime.observation", provenance: "observed", payload: { accepted: result.accepted, duplicates: result.duplicates }, occurredAt: new Date() });
    return NextResponse.json({ success: true, ...result }, { status: 202, headers });
  } catch (error) {
    logger.error("Runtime discovery ingestion failed", { error, websiteId: site.id });
    return NextResponse.json({ success: false, message: "Discovery ingestion failed" }, { status: 500, headers });
  }
}

export async function OPTIONS() { return publicOptionsResponse("POST, OPTIONS"); }
