import { NextResponse } from "next/server";

import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { authorizeCronRequest, getConfiguredCronSecret } from "@/lib/scanner/cron-auth";
import { promoteDueScheduledPolicies } from "@/lib/policy/lifecycle";

export const runtime = "nodejs";
export const maxDuration = 30;

async function handleCron(request: Request) {
  if (!getConfiguredCronSecret() || !authorizeCronRequest(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const limit = rateLimit({
    key: `cron-policies:${getClientIp(request)}`,
    limit: 30,
    windowMs: 60 * 60_000,
  });
  if (!limit.allowed) return rateLimitResponse(limit);
  try {
    const summary = await promoteDueScheduledPolicies();
    logger.info("Scheduled policy publish tick completed", {
      operation: "policy.schedule.tick",
      ...summary,
    });
    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    logger.error("Scheduled policy publish tick failed", {
      operation: "policy.schedule.tick",
      error,
    });
    return NextResponse.json({ success: false, message: "Scheduled policy tick failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
