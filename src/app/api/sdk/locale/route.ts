import { NextResponse } from "next/server";

import { buildCmpLocaleScript } from "@/lib/sdk/cmp-sdk-script";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit-store";
import { publicCorsHeaders, publicOptionsResponse } from "@/lib/sdk/public-http";

export async function GET(request: Request) {
  const headers = publicCorsHeaders("GET, OPTIONS");
  const limit = await consumeRateLimit({
    key: `sdk-locale:${getClientIp(request)}`,
    limit: 600,
    windowMs: 60_000,
  });
  if (!limit.allowed) return rateLimitResponse(limit, headers);

  return new NextResponse(buildCmpLocaleScript(), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      ...publicCorsHeaders("GET, OPTIONS"),
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  });
}

export async function OPTIONS() {
  return publicOptionsResponse("GET, OPTIONS");
}
