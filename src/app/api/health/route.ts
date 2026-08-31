import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/db";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    await db.execute(sql`select 1`);

    return NextResponse.json(
      {
        status: "ok",
        checks: {
          app: "ok",
          database: "ok",
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    logger.error("Health check failed", {
      operation: "health.check",
      error,
    });

    return NextResponse.json(
      {
        status: "unhealthy",
        checks: {
          app: "ok",
          database: "unhealthy",
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
