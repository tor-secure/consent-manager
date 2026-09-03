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
// Shared: resolve org → policy → latest version → attached purposeIds
// Returns null if the caller does not own the policy.
// ---------------------------------------------------------------------------

async function resolveContext(policyId: string, orgId: string) {
  const organization = await resolveLocalOrganization(orgId);

  if (!organization) return null;

  const orgWebsites = await db
    .select({ id: websites.id })
    .from(websites)
    .where(eq(websites.organizationId, organization.id));

  const websiteIds = orgWebsites.map((w) => w.id);
  if (websiteIds.length === 0) return null;

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

  if (!policy) return null;

  const latestVersion = await ensureDraftPolicyVersion(policy.id);
  if (!latestVersion) return null;

  // Fetch purpose IDs attached to this version.
  const attachedLinks = await db
    .select({ purposeId: policyPurposes.purposeId })
    .from(policyPurposes)
    .where(eq(policyPurposes.policyVersionId, latestVersion.id));

  const attachedPurposeIds = attachedLinks.map((l) => l.purposeId);

  return {
    organizationId: organization.id,
    policyId: policy.id,
    policyVersionId: latestVersion.id,
    attachedPurposeIds,
  };
}

// ---------------------------------------------------------------------------
// POST /api/policies/[id]/vendors
// Body: { vendorId: string, purposeIds?: string[] }
//
// Attaches a vendor to this policy by creating vendor_purposes links between
// the vendor and the policy version's attached purposes.
//
// If purposeIds is provided and non-empty, only links for those purposeIds are
// created (must all be among the policy's attached purposes).
// If purposeIds is omitted / empty, all attached purposes are linked.
//
// Tenant chain: Clerk orgId → org → websites → policy → version → purposes
//               + vendor must belong to same org
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: policyId } = await params;
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const localUser = await resolveLocalUser(userId);
    if (!localUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const localOrg = await resolveLocalOrganization(orgId);
    if (!localOrg) {
      return NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 });
    }

    const membership = await resolveActiveMembership(localOrg.id, localUser.id);
    if (!membership) {
      return NextResponse.json({ success: false, message: "You do not belong to this organization." }, { status: 403 });
    }

    const ctx = await resolveContext(policyId, orgId);
    if (!ctx) {
      return NextResponse.json({ success: false, message: "Policy not found" }, { status: 404 });
    }

    const body = await request.json();
    const vendorId = String(body.vendorId ?? "").trim();

    if (!vendorId) {
      return NextResponse.json({ success: false, message: "vendorId is required" }, { status: 400 });
    }

    // Verify vendor belongs to this org.
    const [vendor] = await db
      .select({ id: vendors.id })
      .from(vendors)
      .where(and(eq(vendors.id, vendorId), eq(vendors.organizationId, ctx.organizationId)))
      .limit(1);

    if (!vendor) {
      return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });
    }

    // Policy must have at least one purpose before a vendor can be attached.
    if (ctx.attachedPurposeIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Attach at least one purpose to this policy before linking vendors.",
        },
        { status: 422 },
      );
    }

    // Resolve which purposeIds to link.
    let targetPurposeIds: string[] = ctx.attachedPurposeIds;

    if (Array.isArray(body.purposeIds) && body.purposeIds.length > 0) {
      const requested = (body.purposeIds as unknown[])
        .map((p) => String(p).trim())
        .filter(Boolean);

      // Only allow purposes that are actually attached to the policy.
      const attachedSet = new Set(ctx.attachedPurposeIds);
      targetPurposeIds = requested.filter((p) => attachedSet.has(p));

      if (targetPurposeIds.length === 0) {
        return NextResponse.json(
          { success: false, message: "None of the requested purposeIds are attached to this policy." },
          { status: 422 },
        );
      }
    }

    // Fetch existing vendor_purposes links to avoid duplicates.
    const existingLinks = await db
      .select({ purposeId: vendorPurposes.purposeId })
      .from(vendorPurposes)
      .where(
        and(
          eq(vendorPurposes.vendorId, vendor.id),
          inArray(vendorPurposes.purposeId, targetPurposeIds),
        ),
      );

    const alreadyLinked = new Set(existingLinks.map((l) => l.purposeId));
    const toInsert = targetPurposeIds.filter((p) => !alreadyLinked.has(p));

    if (toInsert.length === 0) {
      return NextResponse.json(
        { success: false, message: "Vendor is already linked to all requested purposes on this policy." },
        { status: 409 },
      );
    }

    const inserted = await db
      .insert(vendorPurposes)
      .values(toInsert.map((purposeId) => ({ vendorId: vendor.id, purposeId })))
      .returning();

    return NextResponse.json(
      { success: true, linkedCount: inserted.length, links: inserted },
      { status: 201 },
    );
  } catch (error) {
    console.error("Attach vendor to policy failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to attach vendor" },
      { status: 500 },
    );
  }
}
