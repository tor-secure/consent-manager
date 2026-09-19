import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { websiteIntegrations } from "@/db/schema/website-integrations";
import { integrations } from "@/db/schema/integrations";
import { auditLogs } from "@/db/schema/audit-logs";
import { resolveLocalOrganization, resolveLocalUser, resolveActiveMembership } from "@/lib/api-auth-helpers";
import { applyIntegrationRuntime, runtimeKindForIntegration, serializeRuntime } from "@/lib/integrations/runtime";
import { requireOperatorRole } from "@/lib/org-roles";

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
    const operatorError = requireOperatorRole(membership.roleName);
    if (operatorError) return operatorError;

    // Load the connection row first to get websiteId.
    const [connection] = await db
      .select({
        id: websiteIntegrations.id,
        websiteId: websiteIntegrations.websiteId,
        integrationId: websiteIntegrations.integrationId,
      })
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

    const [integration] = await db
      .select({ key: integrations.key, category: integrations.category })
      .from(integrations)
      .where(eq(integrations.id, connection.integrationId))
      .limit(1);
    const [website] = await db
      .select({ id: websites.id, consentIntegrations: websites.consentIntegrations })
      .from(websites)
      .where(eq(websites.id, connection.websiteId))
      .limit(1);
    const kind = integration ? runtimeKindForIntegration(integration.key, integration.category) : "none";
    if (website && kind !== "none") {
      const next = applyIntegrationRuntime(website.consentIntegrations, kind, false);
      await db
        .update(websites)
        .set({ consentIntegrations: serializeRuntime(next), updatedAt: new Date() })
        .where(eq(websites.id, website.id));
    }

    await db
      .delete(websiteIntegrations)
      .where(
        and(
          eq(websiteIntegrations.id, id),
          inArray(websiteIntegrations.websiteId, orgWebsiteIds),
        ),
      );

    await db.insert(auditLogs).values({
      organizationId: organization.id,
      userId: localUser.id,
      action: "integration.disconnected",
      resourceType: "website_integration",
      resourceId: connection.id,
      metadata: { websiteId: connection.websiteId, runtimeKind: kind },
    });

    return NextResponse.json({ success: true, runtimeKind: kind });
  } catch (error) {
    logger.error("Integration disconnect failed", { error });
    return NextResponse.json(
      { success: false, message: "Failed to disconnect integration" },
      { status: 500 },
    );
  }
}
