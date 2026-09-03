import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import {
  resolveActiveClerkOrgId,
  resolveActiveMembership,
  resolveLocalOrganization,
  resolveLocalUser,
} from "@/lib/api-auth-helpers";
import {
  siteVerificationToken,
  verifyWebsiteDomain,
} from "@/lib/website-domain-verify";

async function requireOwnedWebsite(websiteId: string, organizationId: string) {
  const [website] = await db
    .select({
      id: websites.id,
      domain: websites.domain,
      siteKey: websites.siteKey,
      verified: websites.verified,
      verifiedAt: websites.verifiedAt,
    })
    .from(websites)
    .where(and(eq(websites.id, websiteId), eq(websites.organizationId, organizationId)))
    .limit(1);
  return website ?? null;
}

async function requireOrgContext(): Promise<
  | { error: NextResponse; organization?: undefined }
  | { error?: undefined; organization: { id: string } }
> {
  const { isAuthenticated, userId, orgId: sessionOrgId } = await auth();
  if (!isAuthenticated || !userId) {
    return { error: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }) };
  }
  const orgId = await resolveActiveClerkOrgId(userId, sessionOrgId);
  if (!orgId) {
    return {
      error: NextResponse.json(
        { success: false, message: "No active organization selected" },
        { status: 400 },
      ),
    };
  }
  const localUser = await resolveLocalUser(userId);
  if (!localUser) {
    return { error: NextResponse.json({ success: false, message: "User not found" }, { status: 404 }) };
  }
  const organization = await resolveLocalOrganization(orgId);
  if (!organization) {
    return { error: NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 }) };
  }
  const membership = await resolveActiveMembership(organization.id, localUser.id);
  if (!membership) {
    return {
      error: NextResponse.json(
        { success: false, message: "You do not belong to this organization." },
        { status: 403 },
      ),
    };
  }
  return { organization };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authContext = await requireOrgContext();
  if (authContext.error) return authContext.error;

  const { id } = await context.params;
  const website = await requireOwnedWebsite(id, authContext.organization.id);
  if (!website) {
    return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
  }

  const token = siteVerificationToken(website.id, website.siteKey);
  return NextResponse.json({
    success: true,
    verified: website.verified,
    verifiedAt: website.verifiedAt,
    domain: website.domain,
    token,
  });
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authContext = await requireOrgContext();
  if (authContext.error) return authContext.error;

  const { id } = await context.params;
  const website = await requireOwnedWebsite(id, authContext.organization.id);
  if (!website) {
    return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
  }

  const token = siteVerificationToken(website.id, website.siteKey);
  const result = await verifyWebsiteDomain(website.domain, token);

  if (!result.verified) {
    return NextResponse.json(
      {
        success: false,
        verified: false,
        checks: result.checks,
        message:
          "Token not found yet. Add DNS TXT, a homepage meta tag, or the well-known file, then try again.",
      },
      { status: 400 },
    );
  }

  const verifiedAt = new Date();
  await db
    .update(websites)
    .set({
      verified: true,
      verifiedAt,
      updatedAt: verifiedAt,
    })
    .where(
      and(eq(websites.id, website.id), eq(websites.organizationId, authContext.organization.id)),
    );

  return NextResponse.json({
    success: true,
    verified: true,
    verifiedAt,
    method: result.method,
    checks: result.checks,
  });
}
