import { NextResponse } from "next/server";

import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { authorizeCronRequest, getConfiguredCronSecret } from "@/lib/scanner/cron-auth";
import { runDueScheduledScans, unlockStaleScheduleLocks } from "@/lib/scanner/run-due-scans";

export const runtime = "nodejs";
export const maxDuration = 60;

async function handleCron(request: Request) {
  if (!getConfiguredCronSecret()) {
    return NextResponse.json(
      {
        success: false,
        message: "Scheduled scanning is not configured. Set CRON_SECRET or SCANNER_CRON_SECRET.",
      },
      { status: 503 },
    );
  }

  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit({
    key: `cron-scans:${getClientIp(request)}`,
    limit: 30,
    windowMs: 60 * 60_000,
  });
  if (!limit.allowed) return rateLimitResponse(limit);

  try {
    await unlockStaleScheduleLocks();
    const summary = await runDueScheduledScans();
    logger.info("Scheduled scan tick completed", {
      operation: "scanner.schedule.tick",
      ...summary,
    });
    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    logger.error("Scheduled scan tick failed", {
      operation: "scanner.schedule.tick",
      error,
    });
    return NextResponse.json(
      { success: false, message: "Scheduled scan tick failed" },
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
