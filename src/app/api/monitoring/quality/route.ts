import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import { computeWebsiteQualityScore } from "@/lib/monitoring/privacy-intelligence";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  try {
    const { isAuthenticated, userId, orgId } = await auth();
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (!orgId) {
      return NextResponse.json({ success: false, message: "No active organization selected" }, { status: 400 });
    }

    const localUser = await resolveLocalUser(userId);
    if (!localUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }
    const organization = await resolveLocalOrganization(orgId);
    if (!organization) {
      return NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 });
    }
    const membership = await resolveActiveMembership(organization.id, localUser.id);
    if (!membership) {
      return NextResponse.json({ success: false, message: "You do not belong to this organization." }, { status: 403 });
    }

    const websiteId = new URL(request.url).searchParams.get("websiteId")?.trim() ?? "";
    if (websiteId && !UUID_RE.test(websiteId)) {
      return NextResponse.json({ success: false, message: "Invalid websiteId" }, { status: 400 });
    }

    const siteRows = await db
      .select({ id: websites.id })
      .from(websites)
      .where(
        websiteId
          ? and(
              eq(websites.organizationId, organization.id),
              eq(websites.id, websiteId),
              isNull(websites.deletedAt),
            )
          : and(eq(websites.organizationId, organization.id), isNull(websites.deletedAt)),
      );

    if (websiteId && siteRows.length === 0) {
      return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
    }

    const scores = await Promise.all(siteRows.map((site) => computeWebsiteQualityScore(site.id)));
    return NextResponse.json({
      success: true,
      scores: scores.filter(Boolean),
    });
  } catch {
    return NextResponse.json({ success: false, message: "Unable to calculate quality scores." }, { status: 500 });
  }
}
