import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/db";
import { runHealthCheck } from "@/lib/health";
import { authorizeCronRequest, getConfiguredCronSecret } from "@/lib/scanner/cron-auth";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    const expected = getConfiguredCronSecret();
    if (!expected || !authorizeCronRequest(request)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401, headers: NO_STORE },
      );
    }
  }

  const result = await runHealthCheck(() => db.execute(sql`select 1`));
  return NextResponse.json(result.body, {
    status: result.statusCode,
    headers: NO_STORE,
  });
}
