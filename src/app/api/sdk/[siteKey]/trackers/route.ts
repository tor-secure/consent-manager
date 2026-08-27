import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { trackers } from "@/db/schema/trackers";
import { purposes } from "@/db/schema/purposes";
import type { TrackerRule } from "@/lib/sdk/enforcement";

// ---------------------------------------------------------------------------
// GET /api/sdk/[siteKey]/trackers
// Public, CORS-enabled endpoint.
// Returns the active tracker rules for a website identified by siteKey.
// The SDK config endpoint already includes these; this endpoint exists for
// incremental polling or when the client needs a fresh tracker list without
// reloading the full config.
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ siteKey: string }> },
) {
  try {
    const { siteKey } = await params;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Cache-Control": "public, max-age=300",
    };

    if (!siteKey?.trim()) {
      return NextResponse.json(
        { success: false, message: "siteKey is required" },
        { status: 400, headers: corsHeaders },
      );
    }

    const [website] = await db
      .select({ id: websites.id, status: websites.status })
      .from(websites)
      .where(
        and(eq(websites.siteKey, siteKey), eq(websites.status, "active")),
      )
      .limit(1);

    if (!website) {
      return NextResponse.json(
        { success: false, message: "Website not found" },
        { status: 404, headers: corsHeaders },
      );
    }

    const trackerRows = await db
      .select({
        id: trackers.id,
        name: trackers.name,
        type: trackers.type,
        domain: trackers.domain,
        identifier: trackers.identifier,
        purposeId: trackers.purposeId,
        vendorId: trackers.vendorId,
        isEssential: trackers.isEssential,
        status: trackers.status,
      })
      .from(trackers)
      .where(
        and(
          eq(trackers.websiteId, website.id),
          eq(trackers.status, "active"),
        ),
      )
      .orderBy(trackers.name);

    // Resolve purpose keys.
    const purposeIds = [
      ...new Set(trackerRows.map((t) => t.purposeId).filter(Boolean) as string[]),
    ];
    const purposeKeyRows =
      purposeIds.length > 0
        ? await db
            .select({ id: purposes.id, key: purposes.key })
            .from(purposes)
            .where(inArray(purposes.id, purposeIds))
        : [];
    const purposeKeyMap = new Map(purposeKeyRows.map((p) => [p.id, p.key]));

    const rules: TrackerRule[] = trackerRows.map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type as TrackerRule["type"],
      domain: t.domain,
      identifier: t.identifier,
      purposeKey: t.purposeId ? (purposeKeyMap.get(t.purposeId) ?? null) : null,
      purposeId: t.purposeId,
      vendorId: t.vendorId,
      isEssential: t.isEssential,
      status: t.status,
    }));

    return NextResponse.json(
      { success: true, trackerRules: rules },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("Tracker rules load failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load tracker rules" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
