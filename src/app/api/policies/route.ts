import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import {
  resolveLocalOrganization,
  resolveLocalUser,
  resolveActiveMembership,
} from "@/lib/api-auth-helpers";

export async function POST(request: Request) {
  try {
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { success: false, message: "No active organization selected" },
        { status: 400 },
      );
    }

    const localUser = await resolveLocalUser(userId);
    if (!localUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    // Resolve local org — never trust client-supplied IDs.
    const organization = await resolveLocalOrganization(orgId);

    if (!organization) {
      return NextResponse.json(
        { success: false, message: "Organization not found" },
        { status: 404 },
      );
    }

    const membership = await resolveActiveMembership(organization.id, localUser.id);
    if (!membership) {
      return NextResponse.json(
        { success: false, message: "You do not belong to this organization." },
        { status: 403 },
      );
    }

    const body = await request.json();

    const websiteId = String(body.websiteId ?? "").trim();
    const name = String(body.name ?? "").trim();
    const description = body.description
      ? String(body.description).trim()
      : null;
    const isDefault = body.isDefault === true;

    if (!websiteId) {
      return NextResponse.json(
        { success: false, message: "Website is required" },
        { status: 400 },
      );
    }

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Policy name is required" },
        { status: 400 },
      );
    }

    // Verify the website belongs to this organization — tenant isolation.
    const [website] = await db
      .select({ id: websites.id })
      .from(websites)
      .where(
        and(
          eq(websites.id, websiteId),
          eq(websites.organizationId, organization.id),
        ),
      )
      .limit(1);

    if (!website) {
      return NextResponse.json(
        { success: false, message: "Website not found" },
        { status: 404 },
      );
    }

    // Create policy and its initial version atomically.
    const result = await db.transaction(async (tx) => {
      // If this policy is marked as default, clear the existing default first.
      if (isDefault) {
        await tx
          .update(consentPolicies)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(
            and(
              eq(consentPolicies.websiteId, website.id),
              eq(consentPolicies.isDefault, true),
            ),
          );
      }

      const [policy] = await tx
        .insert(consentPolicies)
        .values({
          websiteId: website.id,
          name,
          description,
          status: "draft",
          isDefault,
        })
        .returning();

      // Create initial version v1 in draft state.
      const [version] = await tx
        .insert(consentPolicyVersions)
        .values({
          policyId: policy.id,
          version: 1,
          status: "draft",
          configuration: {},
          isPublished: false,
        })
        .returning();

      return { policy, version };
    });

    return NextResponse.json(
      { success: true, policy: result.policy, version: result.version },
      { status: 201 },
    );
  } catch (error) {
    console.error("Policy creation failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create policy" },
      { status: 500 },
    );
  }
}
