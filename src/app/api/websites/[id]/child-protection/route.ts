import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { childProtectionActive, childProtectionIsComplete, parseChildProtectionConfig } from "@/lib/children/config";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import { auth } from "@clerk/nextjs/server";

async function authorizeWebsite(websiteId: string) {
  const { isAuthenticated, userId, orgId } = await auth();
  if (!isAuthenticated || !userId) {
    return { error: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }) };
  }
  if (!orgId) {
    return { error: NextResponse.json({ success: false, message: "No active organization selected" }, { status: 400 }) };
  }
  const localUser = await resolveLocalUser(userId);
  const organization = await resolveLocalOrganization(orgId);
  if (!localUser || !organization) {
    return { error: NextResponse.json({ success: false, message: "Not found" }, { status: 404 }) };
  }
  const membership = await resolveActiveMembership(organization.id, localUser.id);
  if (!membership) {
    return { error: NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 }) };
  }
  const [website] = await db
    .select()
    .from(websites)
    .where(and(eq(websites.id, websiteId), eq(websites.organizationId, organization.id)))
    .limit(1);
  if (!website) {
    return { error: NextResponse.json({ success: false, message: "Website not found" }, { status: 404 }) };
  }
  return { organization, localUser, membership, website };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authz = await authorizeWebsite(id);
  if (authz.error) return authz.error;
  const childProtection = parseChildProtectionConfig(authz.website.childProtection);
  return NextResponse.json({
    success: true,
    childProtection,
    enforcement: {
      active: childProtectionActive(childProtection) || childProtection.ageAssuranceRequired,
      complete: childProtectionIsComplete(childProtection),
      publicationReady: childProtectionIsComplete(childProtection),
      unknownAgeFailsClosed: true,
      selfDeclarationIsNotVerified: true,
      emailIsNotGuardianAuthority: true,
    },
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authz = await authorizeWebsite(id);
  if (authz.error) return authz.error;
  if (authz.membership.roleName !== "Owner" && authz.membership.roleName !== "Admin") {
    return NextResponse.json({ success: false, message: "Only Owner or Admin can update child protection" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = parseChildProtectionConfig(body);
  await db
    .update(websites)
    .set({ childProtection: parsed, updatedAt: new Date() })
    .where(and(eq(websites.id, authz.website.id), eq(websites.organizationId, authz.organization.id)));
  return NextResponse.json({ success: true, childProtection: parsed });
}
