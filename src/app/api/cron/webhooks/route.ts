import { NextResponse } from "next/server";

import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { authorizeCronRequest, getConfiguredCronSecret } from "@/lib/scanner/cron-auth";
import { retryDuePreferenceSyncDeliveries } from "@/lib/webhooks/preference-sync-delivery";

export const runtime = "nodejs";
export const maxDuration = 60;

async function handleCron(request: Request) {
  if (!getConfiguredCronSecret() || !authorizeCronRequest(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit({
    key: `cron-webhooks:${getClientIp(request)}`,
    limit: 60,
    windowMs: 60 * 60_000,
  });
  if (!limit.allowed) return rateLimitResponse(limit);

  try {
    const preferenceSync = await retryDuePreferenceSyncDeliveries({ limit: 25 });
    logger.info("Preference sync webhook cron completed", {
      operation: "preference_sync.cron",
      ...preferenceSync,
    });
    return NextResponse.json({ success: true, preferenceSync });
  } catch (error) {
    logger.error("Preference sync webhook cron failed", {
      operation: "preference_sync.cron",
      error,
    });
    return NextResponse.json(
      { success: false, message: "Webhook cron failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
