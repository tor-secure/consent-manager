import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit-store";
import { publicCorsHeaders, publicOptionsResponse } from "@/lib/sdk/public-http";
import { buildSubjectBridgeScript } from "@/lib/sdk/subject-bridge-script";

/**
 * GET /api/sdk/subject-bridge
 * Tiny helper script for customer sites with login.
 * Calls their same-origin bridge URL, then CMP.setSubjectSession.
 */
export async function GET(request: Request) {
  try {
    const headers = publicCorsHeaders("GET, OPTIONS");
    const limit = await consumeRateLimit({
      key: `sdk-subject-bridge:${getClientIp(request)}`,
      limit: 600,
      windowMs: 60_000,
    });
    if (!limit.allowed) return rateLimitResponse(limit, headers);

    return new NextResponse(buildSubjectBridgeScript(), {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        ...headers,
        "Cache-Control": "public, max-age=60, must-revalidate",
      },
    });
  } catch (error) {
    logger.error("Subject bridge script generation failed", {
      route: "GET /api/sdk/subject-bridge",
      operation: "sdk.subject_bridge.generate",
      error,
    });
    return NextResponse.json({ success: false, message: "Failed to generate bridge script" }, { status: 500 });
  }
}

export function OPTIONS() {
  return publicOptionsResponse("GET, OPTIONS");
}
