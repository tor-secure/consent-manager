import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { websiteIntegrations } from "@/db/schema/website-integrations";
import { integrations } from "@/db/schema/integrations";
import { websites } from "@/db/schema/websites";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import { runtimeKindForIntegration } from "@/lib/integrations/runtime";
import { requireOperatorRole } from "@/lib/org-roles";
import { auth } from "@clerk/nextjs/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { isAuthenticated, userId, orgId } = await auth();
  if (!isAuthenticated || !userId || !orgId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const localUser = await resolveLocalUser(userId);
  const organization = await resolveLocalOrganization(orgId);
  if (!localUser || !organization) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }
  const membership = await resolveActiveMembership(organization.id, localUser.id);
  if (!membership) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  const operatorError = requireOperatorRole(membership.roleName);
  if (operatorError) return operatorError;

  const [connection] = await db
    .select({
      id: websiteIntegrations.id,
      websiteId: websiteIntegrations.websiteId,
      integrationId: websiteIntegrations.integrationId,
      enabled: websiteIntegrations.enabled,
    })
    .from(websiteIntegrations)
    .where(eq(websiteIntegrations.id, id))
    .limit(1);
  if (!connection) return NextResponse.json({ success: false, message: "Connection not found" }, { status: 404 });

  const [website] = await db
    .select({ id: websites.id, organizationId: websites.organizationId })
    .from(websites)
    .where(and(eq(websites.id, connection.websiteId), eq(websites.organizationId, organization.id)))
    .limit(1);
  if (!website) return NextResponse.json({ success: false, message: "Connection not found" }, { status: 404 });

  const [integration] = await db
    .select({ key: integrations.key, category: integrations.category })
    .from(integrations)
    .where(eq(integrations.id, connection.integrationId))
    .limit(1);
  const kind = integration ? runtimeKindForIntegration(integration.key, integration.category) : "none";

  await db
    .update(websiteIntegrations)
    .set({ lastVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(websiteIntegrations.id, connection.id));

  return NextResponse.json({
    success: true,
    ok: connection.enabled,
    runtimeKind: kind,
    runtime: kind !== "none",
    message:
      kind === "none"
        ? "Connection is stored. This catalog item has no CMP runtime hook."
        : "Connection is valid. SDK config will include this runtime signal after the next publish/config fetch.",
  });
}
