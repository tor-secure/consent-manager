import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/db";

// Diagnostic endpoint — restricted to non-production environments.
// Returns only a connectivity status; never exposes row-level data.
export async function GET() {
  // Block entirely in production — this route should not be accessible.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }

  // Require an authenticated Clerk session even in development.
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    // Minimal connectivity check — count only, no row data returned.
    const result = await db.execute<{ count: string }>(
      sql`SELECT count(*)::text AS count FROM organizations`,
    );

    return NextResponse.json({
      success: true,
      database: "connected",
      organizationCount: result[0]?.count ?? "unknown",
    });
  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json(
      { success: false, database: "connection failed" },
      { status: 500 },
    );
  }
}
