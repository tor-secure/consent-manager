import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/db";
import { runHealthCheck } from "@/lib/health";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const result = await runHealthCheck(() => db.execute(sql`select 1`));

  return NextResponse.json(result.body, {
    status: result.statusCode,
    headers: NO_STORE,
  });
}
