import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { privacyFindings } from "@/db/schema/privacy-findings";
import { websites } from "@/db/schema/websites";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import {
  FINDING_SEVERITIES,
  FINDING_STATUSES,
  FINDING_TYPES,
} from "@/lib/monitoring/drift-engine";

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
      return NextResponse.json(
        { success: false, message: "You do not belong to this organization." },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const websiteId = (url.searchParams.get("websiteId") ?? "").trim();
    const severity = (url.searchParams.get("severity") ?? "").trim().toLowerCase();
    const findingType = (url.searchParams.get("type") ?? "").trim().toLowerCase();
    const status = (url.searchParams.get("status") ?? "").trim().toLowerCase();

    if (websiteId && !UUID_RE.test(websiteId)) {
      return NextResponse.json({ success: false, message: "Invalid websiteId" }, { status: 400 });
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

    const filters = [eq(privacyFindings.organizationId, organization.id)];

    if (websiteId) {
      const [website] = await db
        .select({ id: websites.id })
        .from(websites)
        .where(and(eq(websites.id, websiteId), eq(websites.organizationId, organization.id)))
        .limit(1);
      if (!website) {
        return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
      }
      filters.push(eq(privacyFindings.websiteId, website.id));
    }
    if (severity) filters.push(eq(privacyFindings.severity, severity));
    if (findingType) filters.push(eq(privacyFindings.findingType, findingType));
    if (status) filters.push(eq(privacyFindings.status, status));

    const rows = await db
      .select({
        id: privacyFindings.id,
        websiteId: privacyFindings.websiteId,
        findingType: privacyFindings.findingType,
        severity: privacyFindings.severity,
        status: privacyFindings.status,
        trackerId: privacyFindings.trackerId,
        vendorId: privacyFindings.vendorId,
        purposeId: privacyFindings.purposeId,
        fingerprint: privacyFindings.fingerprint,
        title: privacyFindings.title,
        firstDetectedAt: privacyFindings.firstDetectedAt,
        lastDetectedAt: privacyFindings.lastDetectedAt,
        resolvedAt: privacyFindings.resolvedAt,
      })
      .from(privacyFindings)
      .where(and(...filters))
      .orderBy(desc(privacyFindings.lastDetectedAt))
      .limit(200);

    return NextResponse.json({ success: true, findings: rows });
  } catch {
    return NextResponse.json({ success: false, message: "Unable to list findings." }, { status: 500 });
  }
}
