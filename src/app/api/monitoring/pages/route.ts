import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import { loadPageIntelligence } from "@/lib/monitoring/privacy-intelligence";

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
    if (!websiteId || !UUID_RE.test(websiteId)) {
      return NextResponse.json({ success: false, message: "websiteId is required" }, { status: 400 });
    }

    const [site] = await db
      .select({ id: websites.id })
      .from(websites)
      .where(and(eq(websites.id, websiteId), eq(websites.organizationId, organization.id)))
      .limit(1);
    if (!site) {
      return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
    }

    const pages = await loadPageIntelligence(site.id);
    return NextResponse.json({ success: true, pages: pages ?? [] });
  } catch {
    return NextResponse.json({ success: false, message: "Unable to load page intelligence." }, { status: 500 });
  }
}
