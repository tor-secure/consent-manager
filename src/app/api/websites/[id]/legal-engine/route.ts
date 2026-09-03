import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import {
  resolveActiveClerkOrgId,
  resolveActiveMembership,
  resolveLocalOrganization,
  resolveLocalUser,
} from "@/lib/api-auth-helpers";
import { resolveWebsiteConsentContext } from "@/lib/regulations/resolve-website-consent";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { isAuthenticated, userId, orgId: sessionOrgId } = await auth();
  if (!isAuthenticated || !userId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const orgId = await resolveActiveClerkOrgId(userId, sessionOrgId);
  if (!orgId) {
    return NextResponse.json({ success: false, message: "No active organization selected" }, { status: 400 });
  }
  const localUser = await resolveLocalUser(userId);
  const organization = await resolveLocalOrganization(orgId);
  if (!localUser || !organization) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }
  const membership = await resolveActiveMembership(organization.id, localUser.id);
  if (!membership) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const [website] = await db
    .select({
      id: websites.id,
      defaultRegion: websites.defaultRegion,
      defaultRegulationKey: websites.defaultRegulationKey,
    })
    .from(websites)
    .where(and(eq(websites.id, id), eq(websites.organizationId, organization.id)))
    .limit(1);
  if (!website) {
    return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
  }

  let body: { country?: string; region?: string } = {};
  try {
    body = (await request.json()) as { country?: string; region?: string };
  } catch {
    body = {};
  }

  const resolved = await resolveWebsiteConsentContext({
    websiteId: website.id,
    organizationId: organization.id,
    websiteDefaultRegion: website.defaultRegion,
    defaultRegulationKey: website.defaultRegulationKey,
    country: body.country,
    region: body.region,
  });

  return NextResponse.json({
    success: true,
    legalEngine: resolved.legalEngine,
    policy: resolved.selectedPolicy
      ? { id: resolved.selectedPolicy.id, name: resolved.selectedPolicy.name }
      : null,
  });
}
