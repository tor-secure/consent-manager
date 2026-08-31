import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { websiteIntegrations } from "@/db/schema/website-integrations";
import { resolveLocalOrganization, resolveLocalUser, resolveActiveMembership } from "@/lib/api-auth-helpers";

// DELETE /api/integrations/[id]/disconnect
// [id] is websiteIntegrations.id — tenant-safe via website → org chain.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const localUser = await resolveLocalUser(userId);

    if (!localUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    const organization = await resolveLocalOrganization(orgId);

    if (!organization) {
      return NextResponse.json(
        { success: false, message: "Organization not found" },
        { status: 404 },
      );
    }

    const membership = await resolveActiveMembership(organization.id, localUser.id);
    if (!membership) {
      return NextResponse.json(
        { success: false, message: "You do not belong to this organization." },
        { status: 403 },
      );
    }

    // Load the connection row first to get websiteId.
    const [connection] = await db
      .select({ id: websiteIntegrations.id, websiteId: websiteIntegrations.websiteId })
      .from(websiteIntegrations)
      .where(eq(websiteIntegrations.id, id))
      .limit(1);

    if (!connection) {
      return NextResponse.json(
        { success: false, message: "Connection not found" },
        { status: 404 },
      );
    }

    // Verify the website belongs to this org — tenant isolation.
    // Fetch all org website IDs and check membership.
    const orgWebsites = await db
      .select({ id: websites.id })
      .from(websites)
      .where(eq(websites.organizationId, organization.id));

    const orgWebsiteIds = orgWebsites.map((w) => w.id);

    if (!orgWebsiteIds.includes(connection.websiteId)) {
      return NextResponse.json(
        { success: false, message: "Connection not found" },
        { status: 404 },
      );
    }

    await db
      .delete(websiteIntegrations)
      .where(
        and(
          eq(websiteIntegrations.id, id),
          inArray(websiteIntegrations.websiteId, orgWebsiteIds),
        ),
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Integration disconnect failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to disconnect integration" },
      { status: 500 },
    );
  }
}
