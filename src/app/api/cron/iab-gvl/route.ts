import { NextResponse } from "next/server";

import { authorizeCronRequest, getConfiguredCronSecret } from "@/lib/scanner/cron-auth";
import { syncOfficialGvl } from "@/lib/signals/iab-gvl-sync";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 30;

async function sync(request: Request) {
  if (!getConfiguredCronSecret()) {
    return NextResponse.json({ success: false, message: "Set CRON_SECRET to enable GVL sync." }, { status: 503 });
  }
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ success: true, ...(await syncOfficialGvl()) });
  } catch (error) {
    logger.error("IAB GVL sync failed", { operation: "iab.gvl.sync", error });
    return NextResponse.json({ success: false, message: "GVL sync failed" }, { status: 502 });
  }
}

export async function GET(request: Request) { return sync(request); }
export async function POST(request: Request) { return sync(request); }
