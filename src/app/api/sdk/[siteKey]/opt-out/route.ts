import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { parseBannerConfig } from "@/lib/banner-config";
import { parseGpcFromRequest } from "@/lib/ccpa/gpc";
import { publicCaliforniaState, resolveCaliforniaOptOut } from "@/lib/ccpa/state";
import { loadCaliforniaOptOut, upsertCaliforniaOptOut } from "@/lib/ccpa/service";
import { californiaRuntimeApplies } from "@/lib/ccpa/types";
import { parseComplianceDeclarations } from "@/lib/compliance/evaluate";
import { logger } from "@/lib/logger";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { resolveWebsiteConsentContext } from "@/lib/regulations/resolve-website-consent";
import { isValidConsentId,
  isValidSiteKey,
  publicCorsHeaders,
  publicOptionsResponse,
  readPublicJsonObject,
} from "@/lib/sdk/public-http";
import { sdkOriginGuard } from "@/lib/sdk/origin-allowlist";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";

const CORS_HEADERS = publicCorsHeaders("GET, POST, OPTIONS");

export function OPTIONS() {
  return publicOptionsResponse("GET, POST, OPTIONS");
}

async function loadWebsiteBySiteKey(siteKey: string) {
  const [website] = await db
    .select({
      id: websites.id,
      organizationId: websites.organizationId,
      defaultRegion: websites.defaultRegion,
      defaultRegulationKey: websites.defaultRegulationKey,
      status: websites.status,
      domain: websites.domain,
      verified: websites.verified,
    })
    .from(websites)
    .where(and(eq(websites.siteKey, siteKey), eq(websites.status, "active")))
    .limit(1);
  return website ?? null;
}

async function loadPublishedBanner(websiteId: string, organizationId: string) {
  const [row] = await db
    .select({ configuration: consentPolicyVersions.configuration })
    .from(consentPolicyVersions)
    .innerJoin(consentPolicies, eq(consentPolicyVersions.policyId, consentPolicies.id))
    .innerJoin(websites, eq(consentPolicies.websiteId, websites.id))
    .where(
      and(
        eq(consentPolicies.websiteId, websiteId),
        eq(websites.organizationId, organizationId),
        eq(consentPolicyVersions.isPublished, true),
      ),
    )
    .orderBy(desc(consentPolicyVersions.version))
    .limit(1);
  return row?.configuration ?? {};
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteKey: string }> },
) {
  try {
    const { siteKey } = await params;
    const trimmedKey = siteKey?.trim() ?? "";
    if (!isValidSiteKey(trimmedKey)) {
      return NextResponse.json({ success: false, message: "Invalid siteKey" }, { status: 400, headers: CORS_HEADERS });
    }
    const website = await loadWebsiteBySiteKey(trimmedKey);
    if (!website) {
      return NextResponse.json({ success: false, message: "Website not found" }, { status: 404, headers: CORS_HEADERS });
    }
    const originError = sdkOriginGuard(request, website, CORS_HEADERS);
    if (originError) return originError;
    const url = new URL(request.url);
    const consentId = url.searchParams.get("consentId")?.trim() ?? "";
    const gpc = parseGpcFromRequest(request.headers, url.searchParams.get("gpc") === "1" ? true : undefined);
    const resolvedContext = await resolveWebsiteConsentContext({
      websiteId: website.id,
      organizationId: website.organizationId,
      websiteDefaultRegion: website.defaultRegion,
      defaultRegulationKey: website.defaultRegulationKey,
    });
    const banner = parseBannerConfig(
      (await loadPublishedBanner(website.id, website.organizationId)) as Record<string, unknown>,
    );
    const declarations = parseComplianceDeclarations(banner as unknown as Record<string, unknown>, {});
    const persisted = consentId && isValidConsentId(consentId)
      ? await loadCaliforniaOptOut({
          organizationId: website.organizationId,
          websiteId: website.id,
          consentId,
        })
      : null;
    const resolved = resolveCaliforniaOptOut({
      regulationKey: resolvedContext.regulation?.key ?? website.defaultRegulationKey,
      country: resolvedContext.geo.country,
      region: resolvedContext.geo.region,
      header: gpc.header,
      client: gpc.client,
      persisted,
      limitSensitiveConfigured: declarations.limitSensitivePiEnabled,
      jurisdiction: resolvedContext.regulation?.key ?? website.defaultRegulationKey,
    });
    return NextResponse.json(
      {
        success: true,
        california: {
          enabled: californiaRuntimeApplies({
            regulationKey: resolvedContext.regulation?.key ?? website.defaultRegulationKey,
            country: resolvedContext.geo.country,
            region: resolvedContext.geo.region,
          }),
          doNotSellEnabled: declarations.doNotSellEnabled,
          doNotShareEnabled: declarations.doNotShareEnabled,
          limitSensitivePiEnabled: declarations.limitSensitivePiEnabled,
          gpcRuntime: true,
          ...publicCaliforniaState(resolved),
        },
      },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    logger.error("California opt-out GET failed", { error });
    return NextResponse.json({ success: false, message: "Unable to evaluate opt-out state" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteKey: string }> },
) {
  try {
    const { siteKey } = await params;
    const trimmedKey = siteKey?.trim() ?? "";
    if (!isValidSiteKey(trimmedKey)) {
      return NextResponse.json({ success: false, message: "Invalid siteKey" }, { status: 400, headers: CORS_HEADERS });
    }
    const website = await loadWebsiteBySiteKey(trimmedKey);
    if (!website) {
      return NextResponse.json({ success: false, message: "Website not found" }, { status: 404, headers: CORS_HEADERS });
    }
    const originError = sdkOriginGuard(request, website, CORS_HEADERS);
    if (originError) return originError;
    const limit = rateLimit({
      key: `ccpa-opt-out:${website.id}:${getClientIp(request)}`,
      limit: 60,
      windowMs: 60_000,
    });
    if (!limit.allowed) return rateLimitResponse(limit, CORS_HEADERS);

    const parsed = await readPublicJsonObject(request);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.message }, { status: parsed.status, headers: CORS_HEADERS });
    }
    const body = parsed.body;
    const consentId = String(body.consentId ?? "").trim();
    const gpc = parseGpcFromRequest(request.headers, body.gpc);
    const resolvedContext = await resolveWebsiteConsentContext({
      websiteId: website.id,
      organizationId: website.organizationId,
      websiteDefaultRegion: website.defaultRegion,
      defaultRegulationKey: website.defaultRegulationKey,
    });
    const banner = parseBannerConfig(
      (await loadPublishedBanner(website.id, website.organizationId)) as Record<string, unknown>,
    );
    const declarations = parseComplianceDeclarations(banner as unknown as Record<string, unknown>, {});
    const persisted = consentId && isValidConsentId(consentId)
      ? await loadCaliforniaOptOut({
          organizationId: website.organizationId,
          websiteId: website.id,
          consentId,
        })
      : null;
    const resolved = resolveCaliforniaOptOut({
      regulationKey: resolvedContext.regulation?.key ?? website.defaultRegulationKey,
      country: resolvedContext.geo.country,
      region: resolvedContext.geo.region,
      header: gpc.header,
      client: gpc.client,
      persisted,
      manualDoNotSell: body.doNotSell === true || body.saleShare === "opted_out",
      manualDoNotShare: body.doNotShare === true || body.saleShare === "opted_out",
      manualLimitSensitive: body.limitSensitive === true,
      clearManual: body.doNotSell === false && body.doNotShare === false && body.limitSensitive === false && body.optOut === false,
      consentWithdrawn: body.withdrawn === true,
      limitSensitiveConfigured: declarations.limitSensitivePiEnabled,
      jurisdiction: resolvedContext.regulation?.key ?? website.defaultRegulationKey,
    });

    if (consentId && isValidConsentId(consentId)) {
      await upsertCaliforniaOptOut({
        organizationId: website.organizationId,
        websiteId: website.id,
        consentId,
        resolved,
      });
    }

    return NextResponse.json(
      {
        success: true,
        california: {
          enabled: californiaRuntimeApplies({
            regulationKey: resolvedContext.regulation?.key ?? website.defaultRegulationKey,
            country: resolvedContext.geo.country,
            region: resolvedContext.geo.region,
          }),
          doNotSellEnabled: declarations.doNotSellEnabled,
          doNotShareEnabled: declarations.doNotShareEnabled,
          limitSensitivePiEnabled: declarations.limitSensitivePiEnabled,
          gpcRuntime: true,
          ...publicCaliforniaState(resolved),
        },
      },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    logger.error("California opt-out POST failed", { error });
    return NextResponse.json({ success: false, message: "Unable to record opt-out state" }, { status: 500, headers: CORS_HEADERS });
  }
}
