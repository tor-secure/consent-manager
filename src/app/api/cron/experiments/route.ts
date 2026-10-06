import { NextResponse } from "next/server";
import { authorizeCronRequest, getConfiguredCronSecret } from "@/lib/scanner/cron-auth";
import { promoteDueExperiments } from "@/lib/experiments/lifecycle";

export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!getConfiguredCronSecret() || !authorizeCronRequest(request)) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ success: true, ...await promoteDueExperiments() });
  } catch {
    return NextResponse.json({ success: false, message: "Experiment schedule processing failed" }, { status: 500 });
  }
}
