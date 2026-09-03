import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import { FINDING_SEVERITIES, FINDING_STATUSES, FINDING_TYPES } from "@/lib/monitoring/drift-engine";
import { loadOrgRiskSnapshot } from "@/lib/monitoring/privacy-intelligence";

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

    const url = new URL(request.url);
    const websiteId = (url.searchParams.get("websiteId") ?? "").trim();
    const severity = (url.searchParams.get("severity") ?? "").trim();
    const findingType = (url.searchParams.get("type") ?? "").trim();
    const status = (url.searchParams.get("status") ?? "").trim();
    const fromRaw = (url.searchParams.get("from") ?? "").trim();
    const toRaw = (url.searchParams.get("to") ?? "").trim();

    if (websiteId) {
      if (!UUID_RE.test(websiteId)) {
        return NextResponse.json({ success: false, message: "Invalid websiteId" }, { status: 400 });
      }
      const [site] = await db
        .select({ id: websites.id })
        .from(websites)
        .where(and(eq(websites.id, websiteId), eq(websites.organizationId, organization.id)))
        .limit(1);
      if (!site) {
        return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
      }
    }
    if (severity && !FINDING_SEVERITIES.includes(severity as (typeof FINDING_SEVERITIES)[number])) {
      return NextResponse.json({ success: false, message: "Invalid severity" }, { status: 400 });
    }
    if (findingType && !FINDING_TYPES.includes(findingType as (typeof FINDING_TYPES)[number])) {
      return NextResponse.json({ success: false, message: "Invalid finding type" }, { status: 400 });
    }
    if (status && !FINDING_STATUSES.includes(status as (typeof FINDING_STATUSES)[number])) {
      return NextResponse.json({ success: false, message: "Invalid status" }, { status: 400 });
    }

    const from = fromRaw ? new Date(fromRaw) : undefined;
    const to = toRaw ? new Date(toRaw) : undefined;
    if (from && Number.isNaN(from.getTime())) {
      return NextResponse.json({ success: false, message: "Invalid from date" }, { status: 400 });
    }
    if (to && Number.isNaN(to.getTime())) {
      return NextResponse.json({ success: false, message: "Invalid to date" }, { status: 400 });
    }

    const snapshot = await loadOrgRiskSnapshot(organization.id, {
      websiteId: websiteId || undefined,
      severity: severity || undefined,
      findingType: findingType || undefined,
      status: status || undefined,
      from,
      to,
    });

    return NextResponse.json({ success: true, risk: snapshot });
  } catch {
    return NextResponse.json({ success: false, message: "Unable to load privacy risk." }, { status: 500 });
  }
}
