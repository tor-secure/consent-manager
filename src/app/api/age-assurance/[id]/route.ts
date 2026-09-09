import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { publicChildSnapshot } from "@/lib/children/service";
import { publicCorsHeaders, publicOptionsResponse } from "@/lib/sdk/public-http";

const CORS = publicCorsHeaders("GET, OPTIONS");

export async function OPTIONS() {
  return publicOptionsResponse("GET, OPTIONS");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const siteKey = url.searchParams.get("siteKey")?.trim() ?? "";
  const websiteId = url.searchParams.get("websiteId")?.trim() ?? "";
  if (!siteKey || !websiteId || !id) {
    return NextResponse.json(
      { success: false, message: "websiteId, siteKey, and session id are required" },
      { status: 400, headers: CORS },
    );
  }

  const [website] = await db
    .select({ id: websites.id, organizationId: websites.organizationId, siteKey: websites.siteKey })
    .from(websites)
    .where(and(eq(websites.id, websiteId), eq(websites.siteKey, siteKey), eq(websites.status, "active")))
    .limit(1);
  if (!website) {
    return NextResponse.json({ success: false, message: "Website not found" }, { status: 404, headers: CORS });
  }

  const snapshot = await publicChildSnapshot({
    organizationId: website.organizationId,
    websiteId: website.id,
    sessionId: id,
  });
  if (!snapshot || !snapshot.sessionId) {
    return NextResponse.json({ success: false, message: "Session not found" }, { status: 404, headers: CORS });
  }

  return NextResponse.json({
    success: true,
    sessionId: snapshot.sessionId,
    age: snapshot.view,
    ageContext: snapshot.ageContext,
  }, { headers: CORS });
}
