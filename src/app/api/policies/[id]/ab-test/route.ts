import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import { defaultBannerAbTest, parseBannerAbTest, type BannerAbTest } from "@/lib/intelligence/ab-test";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: policyId } = await params;
    if (!UUID_RE.test(policyId)) {
      return NextResponse.json({ success: false, message: "Invalid policy id" }, { status: 400 });
    }

    const { isAuthenticated, userId, orgId } = await auth();
    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
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

    const orgWebsites = await db
      .select({ id: websites.id })
      .from(websites)
      .where(eq(websites.organizationId, organization.id));
    const websiteIds = orgWebsites.map((row) => row.id);
    if (websiteIds.length === 0) {
      return NextResponse.json({ success: false, message: "Policy not found" }, { status: 404 });
    }

    const [policy] = await db
      .select({ id: consentPolicies.id })
      .from(consentPolicies)
      .where(and(eq(consentPolicies.id, policyId), inArray(consentPolicies.websiteId, websiteIds)))
      .limit(1);
    if (!policy) {
      return NextResponse.json({ success: false, message: "Policy not found" }, { status: 404 });
    }

    const allVersions = await db
      .select({
        id: consentPolicyVersions.id,
        version: consentPolicyVersions.version,
        isPublished: consentPolicyVersions.isPublished,
        configuration: consentPolicyVersions.configuration,
      })
      .from(consentPolicyVersions)
      .where(eq(consentPolicyVersions.policyId, policy.id))
      .orderBy(consentPolicyVersions.version);

    const latestVersion = allVersions[allVersions.length - 1] ?? null;
    if (!latestVersion) {
      return NextResponse.json({ success: false, message: "No policy version found" }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const existingRaw =
      latestVersion.configuration &&
      typeof latestVersion.configuration === "object" &&
      !Array.isArray(latestVersion.configuration)
        ? (latestVersion.configuration as Record<string, unknown>)
        : {};

    let next: BannerAbTest | null = parseBannerAbTest(body.abTest) ?? parseBannerAbTest(existingRaw.abTest);
    if (!next && body.seedDefault === true) {
      next = defaultBannerAbTest();
    }
    if (!next) {
      return NextResponse.json(
        { success: false, message: "Provide abTest variants or seedDefault" },
        { status: 400 },
      );
    }
    if (typeof body.enabled === "boolean") {
      next = { ...next, enabled: body.enabled };
    }

    const saveIds = new Set<string>([latestVersion.id]);
    for (const version of allVersions) {
      if (version.isPublished) saveIds.add(version.id);
    }

    const payload = { ...existingRaw, abTest: next };
    await db
      .update(consentPolicyVersions)
      .set({ configuration: payload, updatedAt: new Date() })
      .where(inArray(consentPolicyVersions.id, [...saveIds]));

    return NextResponse.json({ success: true, abTest: next });
  } catch (error) {
    console.error("A/B test save failed:", error);
    return NextResponse.json({ success: false, message: "Failed to save experiment" }, { status: 500 });
  }
}
