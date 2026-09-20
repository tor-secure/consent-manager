import { NextResponse } from "next/server";

import { verifyRightsToken } from "@/lib/privacy-rights/service";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit-store";

export async function POST(request: Request) {
  const limit = await consumeRateLimit({
    key: `rights-verify:${getClientIp(request)}`,
    limit: 8,
    windowMs: 15 * 60_000,
  });
  if (!limit.allowed) return rateLimitResponse(limit);

  let token = "";
  try {
    const body = await request.json();
    token = String(body.token ?? "").trim();
  } catch {
    token = "";
  }

  if (!token) {
    return NextResponse.json({ success: false, message: "Verification failed" }, { status: 400 });
  }

  const result = await verifyRightsToken({ token });
  if (!result.ok) {
    return NextResponse.json({ success: false, message: "Verification failed" }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    status: "verified",
    message: "Identity verified. The request is now available for operator review.",
  });
}
