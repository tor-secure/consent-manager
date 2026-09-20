import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { negotiationConfigurations, negotiationOutcomes } from "@/db/schema/intelligence";
import { purposes } from "@/db/schema/purposes";
import { websites } from "@/db/schema/websites";
import { negotiationOfferSchema, publicNegotiationOffers } from "@/lib/intelligence/negotiation-offers";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit-store";
import { isValidSiteKey, publicCorsHeaders, publicOptionsResponse } from "@/lib/sdk/public-http";
import { sdkOriginGuard } from "@/lib/sdk/origin-allowlist";

const bodySchema = z.object({
  offerKey: z.string().regex(/^[a-z0-9_-]{1,100}$/),
  outcome: z.enum(["shown", "selected", "dismissed"]),
  purposeKeys: z.array(z.string().min(1).max(100)).max(20),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteKey: string }> },
) {
  const headers = publicCorsHeaders("POST, OPTIONS");
  const { siteKey } = await params;
  if (!isValidSiteKey(siteKey)) {
    return NextResponse.json({ success: false, message: "Invalid site key" }, { status: 400, headers });
  }
  const limit = await consumeRateLimit({
    key: `negotiation-outcome:${siteKey}:${getClientIp(request)}`,
    limit: 60,
    windowMs: 60 * 60_000,
  });
  if (!limit.allowed) return rateLimitResponse(limit, headers);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid outcome" }, { status: 400, headers });

  const [row] = await db
    .select({
      websiteId: websites.id,
      organizationId: websites.organizationId,
      domain: websites.domain,
      verified: websites.verified,
      enabled: negotiationConfigurations.enabled,
      offers: negotiationConfigurations.offers,
    })
    .from(websites)
    .innerJoin(negotiationConfigurations, eq(negotiationConfigurations.websiteId, websites.id))
    .where(and(eq(websites.siteKey, siteKey), eq(websites.status, "active")))
    .limit(1);
  if (!row) return NextResponse.json({ success: false, message: "Negotiation is unavailable" }, { status: 404, headers });
  const originError = sdkOriginGuard(request, row, headers);
  if (originError) return originError;
  const required = await db
    .select({ key: purposes.key })
    .from(purposes)
    .where(and(eq(purposes.organizationId, row.organizationId), eq(purposes.isRequired, true)));
  const offers = publicNegotiationOffers({
    enabled: row.enabled,
    offers: row.offers,
    requiredPurposeKeys: required.map((purpose) => purpose.key),
  });
  const offer = offers.find((item) => item.key === parsed.data.offerKey);
  if (
    !offer ||
    negotiationOfferSchema.safeParse(offer).success === false ||
    offer.purposeKeys.join("\0") !== parsed.data.purposeKeys.join("\0")
  ) {
    return NextResponse.json({ success: false, message: "Unknown offer" }, { status: 400, headers });
  }
  await db.insert(negotiationOutcomes).values({
    organizationId: row.organizationId,
    websiteId: row.websiteId,
    offerKey: offer.key,
    outcome: parsed.data.outcome,
    purposeKeys: offer.purposeKeys,
  });
  return NextResponse.json({ success: true }, { status: 201, headers });
}

export async function OPTIONS() {
  return publicOptionsResponse("POST, OPTIONS");
}
