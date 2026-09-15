import "server-only";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { consentPolicies } from "@/db/schema/consent-policies";
import { websites } from "@/db/schema/websites";
import {
  resolveActiveMembership,
  resolveLocalOrganization,
  resolveLocalUser,
} from "@/lib/api-auth-helpers";

export async function authorizeOwnedPolicy(policyId: string) {
  const { isAuthenticated, userId, orgId } = await auth();
  if (!isAuthenticated || !userId) {
    return {
      error: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }),
    };
  }
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
    return {
      error: NextResponse.json({ success: false, message: "User not found" }, { status: 404 }),
    };
  }

  const organization = await resolveLocalOrganization(orgId);
  if (!organization) {
    return {
      error: NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 }),
    };
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

  const [row] = await db
    .select({
      policyId: consentPolicies.id,
      policyName: consentPolicies.name,
      policyStatus: consentPolicies.status,
      websiteId: websites.id,
      websiteName: websites.name,
      websiteSiteKey: websites.siteKey,
      websiteOrganizationId: websites.organizationId,
      defaultRegulationKey: websites.defaultRegulationKey,
      defaultRegion: websites.defaultRegion,
      consentIntegrations: websites.consentIntegrations,
    })
    .from(consentPolicies)
    .innerJoin(websites, eq(consentPolicies.websiteId, websites.id))
    .where(
      and(
        eq(consentPolicies.id, policyId),
        eq(websites.organizationId, organization.id),
      ),
    )
    .limit(1);

  if (!row) {
    return {
      error: NextResponse.json({ success: false, message: "Policy not found" }, { status: 404 }),
    };
  }

  return { localUser, organization, membership, policy: row };
}
