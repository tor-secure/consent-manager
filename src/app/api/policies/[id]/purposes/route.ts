import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { policyPurposes } from "@/db/schema/policy-purposes";
import { purposes } from "@/db/schema/purposes";

// ---------------------------------------------------------------------------
// Shared: resolve org + verify policy ownership, return latest version id
// ---------------------------------------------------------------------------

async function resolveContext(policyId: string, orgId: string) {
  const [organization] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  if (!organization) return null;

  // Scope policy through org websites — consent_policies has no direct orgId.
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

  // Get the latest version (highest version number).
  const allVersions = await db
    .select({ id: consentPolicyVersions.id, version: consentPolicyVersions.version })
    .from(consentPolicyVersions)
    .where(eq(consentPolicyVersions.policyId, policy.id))
    .orderBy(consentPolicyVersions.version);

  const latestVersion = allVersions[allVersions.length - 1] ?? null;
  if (!latestVersion) return null;

  return { organizationId: organization.id, policyId: policy.id, policyVersionId: latestVersion.id };
}

// ---------------------------------------------------------------------------
// POST /api/policies/[id]/purposes
// Body: { purposeId: string }
// Attaches an org-owned purpose to the latest policy version.
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

    const ctx = await resolveContext(policyId, orgId);
    if (!ctx) {
      return NextResponse.json({ success: false, message: "Policy not found" }, { status: 404 });
    }

    const body = await request.json();
    const purposeId = String(body.purposeId ?? "").trim();

    if (!purposeId) {
      return NextResponse.json({ success: false, message: "purposeId is required" }, { status: 400 });
    }

    // Verify the purpose belongs to this org.
    const [purpose] = await db
      .select({ id: purposes.id })
      .from(purposes)
      .where(
        and(
          eq(purposes.id, purposeId),
          eq(purposes.organizationId, ctx.organizationId),
        ),
      )
      .limit(1);

    if (!purpose) {
      return NextResponse.json({ success: false, message: "Purpose not found" }, { status: 404 });
    }

    // Check if already attached.
    const [existing] = await db
      .select({ id: policyPurposes.id })
      .from(policyPurposes)
      .where(
        and(
          eq(policyPurposes.policyVersionId, ctx.policyVersionId),
          eq(policyPurposes.purposeId, purposeId),
        ),
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Purpose is already attached to this policy version" },
        { status: 409 },
      );
    }

    const [link] = await db
      .insert(policyPurposes)
      .values({ policyVersionId: ctx.policyVersionId, purposeId })
      .returning();

    return NextResponse.json({ success: true, policyPurpose: link }, { status: 201 });
  } catch (error) {
    console.error("Attach purpose failed:", error);
    return NextResponse.json({ success: false, message: "Failed to attach purpose" }, { status: 500 });
  }
}
