import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { privacyFindings } from "@/db/schema/privacy-findings";
import { websites } from "@/db/schema/websites";
import { auditLogs } from "@/db/schema/audit-logs";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { isAuthenticated, userId, orgId } = await auth();
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (!orgId) {
      return NextResponse.json({ success: false, message: "No active organization selected" }, { status: 400 });
    }

    const { id } = await context.params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ success: false, message: "Invalid finding id" }, { status: 400 });
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

    const [existing] = await db
      .select({
        id: privacyFindings.id,
        status: privacyFindings.status,
        websiteId: privacyFindings.websiteId,
      })
      .from(privacyFindings)
      .innerJoin(websites, eq(privacyFindings.websiteId, websites.id))
      .where(
        and(
          eq(privacyFindings.id, id),
          eq(privacyFindings.organizationId, organization.id),
          eq(websites.organizationId, organization.id),
        ),
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ success: false, message: "Finding not found" }, { status: 404 });
    }

    const now = new Date();
    await db
      .update(privacyFindings)
      .set({
        status: "resolved",
        resolvedAt: now,
        resolvedBy: localUser.id,
        updatedAt: now,
      })
      .where(
        and(
          eq(privacyFindings.id, existing.id),
          eq(privacyFindings.organizationId, organization.id),
        ),
      );

    await db.insert(auditLogs).values({
      organizationId: organization.id,
      userId: localUser.id,
      action: "privacy_finding.resolved",
      resourceType: "privacy_finding",
      resourceId: existing.id,
      description: "Privacy finding marked resolved",
      metadata: { websiteId: existing.websiteId, previousStatus: existing.status },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, message: "Unable to resolve finding." }, { status: 500 });
  }
}
