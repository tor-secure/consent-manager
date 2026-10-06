import { NextResponse } from "next/server";
import { processNextBrowserCrawl } from "@/lib/scanner/browser-crawler";
import { authorizeCronRequest } from "@/lib/scanner/cron-auth";

/** Invoke from the existing scheduler. Each invocation claims at most one bounded crawl. */
export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const scanId = await processNextBrowserCrawl();
  return NextResponse.json({ success: true, scanId });
}
