import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { policyPurposes } from "@/db/schema/policy-purposes";
import { purposes } from "@/db/schema/purposes";
import { resolveLocalOrganization, resolveLocalUser, resolveActiveMembership } from "@/lib/api-auth-helpers";

// ---------------------------------------------------------------------------
// DELETE /api/policies/[id]/purposes/[purposeId]
// Detaches a purpose from the latest version of the policy.
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; purposeId: string }> },
) {
  try {
    const { id: policyId, purposeId } = await params;
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

    // Scope policy through org websites.
    const orgWebsites = await db
      .select({ id: websites.id })
      .from(websites)
      .where(eq(websites.organizationId, organization.id));

    const websiteIds = orgWebsites.map((w) => w.id);
    if (websiteIds.length === 0) {
      return NextResponse.json({ success: false, message: "Policy not found" }, { status: 404 });
    }

    const [policy] = await db
      .select({ id: consentPolicies.id })
      .from(consentPolicies)
      .where(
        and(
          eq(consentPolicies.id, policyId),
          inArray(consentPolicies.websiteId, websiteIds),
        ),
      )
      .limit(1);

    if (!policy) {
      return NextResponse.json({ success: false, message: "Policy not found" }, { status: 404 });
    }

    // Get latest version.
    const allVersions = await db
      .select({ id: consentPolicyVersions.id, version: consentPolicyVersions.version })
      .from(consentPolicyVersions)
      .where(eq(consentPolicyVersions.policyId, policy.id))
      .orderBy(consentPolicyVersions.version);

    const latestVersion = allVersions[allVersions.length - 1] ?? null;
    if (!latestVersion) {
      return NextResponse.json({ success: false, message: "Policy version not found" }, { status: 404 });
    }

    // Verify the purpose belongs to this org before detaching.
    const [purpose] = await db
      .select({ id: purposes.id })
      .from(purposes)
      .where(
        and(
          eq(purposes.id, purposeId),
          eq(purposes.organizationId, organization.id),
        ),
      )
      .limit(1);

    if (!purpose) {
      return NextResponse.json({ success: false, message: "Purpose not found" }, { status: 404 });
    }

    // Delete the link — scoped to the latest version only.
    const deleted = await db
      .delete(policyPurposes)
      .where(
        and(
          eq(policyPurposes.policyVersionId, latestVersion.id),
          eq(policyPurposes.purposeId, purposeId),
        ),
      )
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { success: false, message: "Purpose is not attached to this policy version" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Detach purpose failed:", error);
    return NextResponse.json({ success: false, message: "Failed to detach purpose" }, { status: 500 });
  }
}
