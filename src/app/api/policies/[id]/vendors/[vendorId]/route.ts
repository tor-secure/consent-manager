import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { policyPurposes } from "@/db/schema/policy-purposes";
import { vendors } from "@/db/schema/vendors";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import { resolveLocalOrganization, resolveLocalUser, resolveActiveMembership } from "@/lib/api-auth-helpers";
import { ensureDraftPolicyVersion } from "@/lib/policy-draft-version";

// ---------------------------------------------------------------------------
// DELETE /api/policies/[id]/vendors/[vendorId]
//
// Detaches a vendor from this policy by removing all vendor_purposes links
// between the vendor and the purposes attached to the policy's latest version.
//
// Tenant chain: Clerk orgId → org → websites → policy → version → purposes
//               + vendor must belong to same org
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; vendorId: string }> },
) {
  try {
    const { id: policyId, vendorId } = await params;
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const localUser = await resolveLocalUser(userId);
    if (!localUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // ── Resolve org ─────────────────────────────────────────────────────────
    const organization = await resolveLocalOrganization(orgId);

    if (!organization) {
      return NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 });
    }

    const membership = await resolveActiveMembership(organization.id, localUser.id);
    if (!membership) {
      return NextResponse.json({ success: false, message: "You do not belong to this organization." }, { status: 403 });
    }

    // ── Scope policy through org websites ────────────────────────────────────
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

    const latestVersion = await ensureDraftPolicyVersion(policy.id);
    if (!latestVersion) {
      return NextResponse.json({ success: false, message: "Policy version not found" }, { status: 404 });
    }

    // ── Verify vendor belongs to this org ────────────────────────────────────
    const [vendor] = await db
      .select({ id: vendors.id })
      .from(vendors)
      .where(and(eq(vendors.id, vendorId), eq(vendors.organizationId, organization.id)))
      .limit(1);

    if (!vendor) {
      return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });
    }

    // ── Fetch attached purpose IDs for this version ──────────────────────────
    const attachedLinks = await db
      .select({ purposeId: policyPurposes.purposeId })
      .from(policyPurposes)
      .where(eq(policyPurposes.policyVersionId, latestVersion.id));

    const attachedPurposeIds = attachedLinks.map((l) => l.purposeId);

    if (attachedPurposeIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "No purposes are attached to this policy version." },
        { status: 404 },
      );
    }

    // ── Delete all vendor_purposes links between vendor and policy purposes ──
    const deleted = await db
      .delete(vendorPurposes)
      .where(
        and(
          eq(vendorPurposes.vendorId, vendor.id),
          inArray(vendorPurposes.purposeId, attachedPurposeIds),
        ),
      )
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { success: false, message: "Vendor is not linked to any purposes on this policy." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, removedCount: deleted.length });
  } catch (error) {
    console.error("Detach vendor from policy failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to detach vendor" },
      { status: 500 },
    );
  }
}
