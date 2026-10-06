import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { parseSecGpcHeader, readSecGpcHeaderValue } from "@/lib/ccpa/gpc";
import { countryFromRequestHeaders } from "@/lib/analytics/client-hints";
import { regionFromRequestHeaders } from "@/lib/regulations/geo";
import { sdkConfigCacheHeaders } from "@/lib/policy/lifecycle-core";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { consumeRateLimit } from "@/lib/rate-limit-store";
import {
  isValidSiteKey,
  publicCorsHeaders,
  publicOptionsResponse,
} from "@/lib/sdk/public-http";
import { sdkOriginGuard } from "@/lib/sdk/origin-allowlist";
import {
  loadSdkConfig,
  normalizeSdkConfigDimensions,
  sdkConfigCacheKey,
  sdkConfigCacheMetrics,
  type SdkConfigCacheEntry,
  type SdkConfigLoadResult,
} from "@/lib/sdk/config-cache";
import { sdkConfigBodyWithFreshPolicyContexts } from "@/lib/policy-context";
import { nextSdkConfigStore } from "@/lib/sdk/config-cache-next";
import { loadPublishedSdkConfig } from "@/lib/sdk/load-published-config";

const corsHeaders = publicCorsHeaders("GET, OPTIONS");

function timingHeaders(result: SdkConfigLoadResult, configHash: string) {
  return {
    ...corsHeaders,
    ...sdkConfigCacheHeaders(configHash),
    "X-SDK-Config-Cache": result.outcome,
    "Server-Timing": [
      `cache;dur=${result.cacheReadMs.toFixed(2)}`,
      `build;dur=${result.buildMs.toFixed(2)}`,
      `total;dur=${result.totalMs.toFixed(2)}`,
    ].join(", "),
    "Access-Control-Expose-Headers": "Server-Timing, X-SDK-Config-Cache",
  };
}

function logCacheSummary(siteKey: string, result: SdkConfigLoadResult) {
  const metrics = sdkConfigCacheMetrics();
  if (result.outcome !== "hit" || metrics.requests % 100 === 0) {
    logger.info("SDK config cache", {
      operation: "sdk.config.cache",
      siteKey,
      outcome: result.outcome,
      cacheReadMs: Math.round(result.cacheReadMs),
      buildMs: Math.round(result.buildMs),
      totalMs: Math.round(result.totalMs),
      requests: metrics.requests,
      hits: metrics.hits,
      misses: metrics.misses,
      fallbacks: metrics.fallbacks,
      databaseBuilds: metrics.databaseBuilds,
      hitRatio: Number(metrics.hitRatio.toFixed(4)),
      p50: metrics.total?.p50 ?? null,
      p95: metrics.total?.p95 ?? null,
      p99: metrics.total?.p99 ?? null,
    });
  }
}

function jsonFromEntry(entry: SdkConfigCacheEntry, result: SdkConfigLoadResult) {
  return NextResponse.json(sdkConfigBodyWithFreshPolicyContexts(entry.body), {
    headers: timingHeaders(result, entry.configHash),
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteKey: string }> },
) {
  const pendingHeaders = {
    ...corsHeaders,
    ...sdkConfigCacheHeaders("pending"),
  };
  try {
    const { siteKey } = await params;
    const trimmedKey = siteKey?.trim() ?? "";
    if (!trimmedKey) {
      return NextResponse.json(
        { success: false, message: "siteKey is required" },
        { status: 400, headers: pendingHeaders },
      );
    }
    if (!isValidSiteKey(trimmedKey)) {
      return NextResponse.json(
        { success: false, message: "Invalid siteKey" },
        { status: 400, headers: pendingHeaders },
      );
    }

    const admission = rateLimit({
      key: `sdk-config:${getClientIp(request)}:${trimmedKey}`,
      limit: 120,
      windowMs: 60_000,
    });
    if (!admission.allowed) return rateLimitResponse(admission, pendingHeaders);

    const url = new URL(request.url);
    const gpcHeader = parseSecGpcHeader(readSecGpcHeaderValue(request.headers));
    const dimensions = normalizeSdkConfigDimensions({
      siteKey: trimmedKey,
      queryLang: url.searchParams.get("lang"),
      acceptLanguage: request.headers.get("accept-language"),
      country: url.searchParams.get("country") || countryFromRequestHeaders(request.headers),
      region: url.searchParams.get("region") || regionFromRequestHeaders(request.headers),
      gpc: gpcHeader === "valid_1" ? "valid_1" : gpcHeader === "invalid" ? "invalid" : "absent",
    });
    const cacheKey = sdkConfigCacheKey(dimensions);
    const gpcActive = gpcHeader === "valid_1";

    const result = await loadSdkConfig({
      key: cacheKey,
      siteKey: trimmedKey,
      store: nextSdkConfigStore,
      loader: async () => {
        const sharedLimit = await consumeRateLimit({
          key: `sdk-config:${getClientIp(request)}:${trimmedKey}`,
          limit: 120,
          windowMs: 60_000,
        });
        if (!sharedLimit.allowed) {
          return {
            ok: false,
            failure: { status: 429, message: "Too many requests" },
          };
        }
        return loadPublishedSdkConfig({
          dimensions,
          gpcHeader,
          gpcActive,
          queryLang: url.searchParams.get("lang"),
          acceptLanguage: request.headers.get("accept-language"),
        });
      },
    });

    logCacheSummary(trimmedKey, result);

    if (result.failure) {
      if (result.failure.status === 429) {
        return rateLimitResponse(
          {
            allowed: false,
            limit: 120,
            remaining: 0,
            resetAt: Date.now() + 60_000,
            retryAfterSeconds: 60,
          },
          pendingHeaders,
        );
      }
      return NextResponse.json(
        { success: false, message: result.failure.message },
        { status: result.failure.status, headers: pendingHeaders },
      );
    }

    if (!result.entry || result.entry.siteKey !== trimmedKey || result.entry.organizationId.length === 0) {
      return NextResponse.json(
        { success: false, message: "Failed to load SDK configuration" },
        { status: 500, headers: pendingHeaders },
      );
    }

    const originError = sdkOriginGuard(
      request,
      { domain: result.entry.domain, verified: result.entry.verified },
      timingHeaders(result, result.entry.configHash),
    );
    if (originError) return originError;
    return jsonFromEntry(result.entry, result);
  } catch (error) {
    logger.error("SDK config load failed", {
      route: "GET /api/sdk/[siteKey]/config",
      operation: "sdk.config.load",
      error,
    });
    return NextResponse.json(
      { success: false, message: "Failed to load SDK configuration" },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS() {
  return publicOptionsResponse("GET, OPTIONS");
}
