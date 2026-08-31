import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { policyPurposes } from "@/db/schema/policy-purposes";
import { resolveLocalOrganization, resolveLocalUser, resolveActiveMembership } from "@/lib/api-auth-helpers";

// ---------------------------------------------------------------------------
// POST /api/policies/[id]/publish
//
// Publishes the latest draft version of a consent policy.
//
// Validation rules (all must pass before any write):
//   1. Caller is authenticated and belongs to the org that owns this policy.
//   2. The policy has at least one version.
//   3. The latest version is NOT already published (prevents accidental
//      overwrite — to re-publish with changes the user must bump a new version).
//   4. The latest version has at least one purpose attached.
//
// On success:
//   • Sets latest version: isPublished=true, status='active',
//     publishedAt=now, effectiveFrom=now.
//   • Sets the parent consent_policy: status='active'.
//   • Returns the updated version row.
// ---------------------------------------------------------------------------

export async function POST(
  _request: Request,
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

    // ── 1. Resolve org ──────────────────────────────────────────────────────
    const organization = await resolveLocalOrganization(orgId);

    if (!organization) {
      return NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 });
    }

    const membership = await resolveActiveMembership(organization.id, localUser.id);
    if (!membership) {
      return NextResponse.json({ success: false, message: "You do not belong to this organization." }, { status: 403 });
    }

    // ── 2. Scope policy through org websites ────────────────────────────────
    const orgWebsites = await db
      .select({ id: websites.id })
      .from(websites)
      .where(eq(websites.organizationId, organization.id));

    const websiteIds = orgWebsites.map((w) => w.id);
    if (websiteIds.length === 0) {
      return NextResponse.json({ success: false, message: "Policy not found" }, { status: 404 });
    }

    const [policy] = await db
      .select({ id: consentPolicies.id, status: consentPolicies.status })
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

    // ── 3. Get latest version ───────────────────────────────────────────────
    const allVersions = await db
      .select({
        id: consentPolicyVersions.id,
        version: consentPolicyVersions.version,
        status: consentPolicyVersions.status,
        isPublished: consentPolicyVersions.isPublished,
      })
      .from(consentPolicyVersions)
      .where(eq(consentPolicyVersions.policyId, policy.id))
      .orderBy(consentPolicyVersions.version);

    const latestVersion = allVersions[allVersions.length - 1] ?? null;

    if (!latestVersion) {
      return NextResponse.json(
        { success: false, message: "This policy has no versions to publish." },
        { status: 422 },
      );
    }

    // ── 4. Guard: already published ─────────────────────────────────────────
    if (latestVersion.isPublished) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Version v${latestVersion.version} is already published. ` +
            "Create a new draft version to make changes.",
          alreadyPublished: true,
        },
        { status: 409 },
      );
    }

    // ── 5. Guard: must have at least one purpose ────────────────────────────
    const [purposeCount] = await db
      .select({ count: policyPurposes.id })
      .from(policyPurposes)
      .where(eq(policyPurposes.policyVersionId, latestVersion.id))
      .limit(1);

    if (!purposeCount) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A policy must have at least one purpose before it can be published.",
          missingPurposes: true,
        },
        { status: 422 },
      );
    }

    // ── 6. Publish — update version + policy in one round-trip ─────────────
    const now = new Date();

    const [updatedVersion] = await db
      .update(consentPolicyVersions)
      .set({
        isPublished: true,
        status: "active",
        publishedAt: now,
        effectiveFrom: now,
        updatedAt: now,
      })
      .where(eq(consentPolicyVersions.id, latestVersion.id))
      .returning();

    // Reflect active status on the parent policy too.
    await db
      .update(consentPolicies)
      .set({ status: "active", updatedAt: now })
      .where(eq(consentPolicies.id, policy.id));

    return NextResponse.json(
      {
        success: true,
        version: {
          id: updatedVersion.id,
          version: updatedVersion.version,
          isPublished: updatedVersion.isPublished,
          publishedAt: updatedVersion.publishedAt,
          effectiveFrom: updatedVersion.effectiveFrom,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Publish policy failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to publish policy" },
      { status: 500 },
    );
  }
}
