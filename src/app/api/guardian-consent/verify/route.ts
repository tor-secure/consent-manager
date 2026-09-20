import { NextResponse } from "next/server";

import { verifyGuardianToken } from "@/lib/children/service";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit-store";
import { publicCorsHeaders, publicOptionsResponse } from "@/lib/sdk/public-http";

const CORS = publicCorsHeaders("POST, OPTIONS");

export async function OPTIONS() {
  return publicOptionsResponse("POST, OPTIONS");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = String(body.token ?? "").trim();
  if (!token) {
    return NextResponse.json({ success: false, message: "token is required" }, { status: 400, headers: CORS });
  }
  const limit = await consumeRateLimit({
    key: `guardian-verify:${getClientIp(request)}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!limit.allowed) return rateLimitResponse(limit, CORS);

  const result = await verifyGuardianToken({ token });
  if (!result.ok) {
    return NextResponse.json(
      { success: false, message: "Verification failed" },
      { status: 400, headers: CORS },
    );
  }
  return NextResponse.json({
    success: true,
    age: result.view,
    authorityVerified: result.authorityVerified,
    notice: "Guardian contact was proven. This does not establish legal guardian authority, and restricted processing remains blocked.",
  }, { headers: CORS });
}
