import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { vendors } from "@/db/schema/vendors";
import { purposes } from "@/db/schema/purposes";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import { resolveLocalOrganization, resolveLocalUser, resolveActiveMembership } from "@/lib/api-auth-helpers";

// ---------------------------------------------------------------------------
// POST /api/vendors/[id]/purposes
// Attaches an org purpose to a vendor.
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: vendorId } = await params;
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

    // Verify vendor belongs to this org.
    const [vendor] = await db
      .select({ id: vendors.id })
      .from(vendors)
      .where(and(eq(vendors.id, vendorId), eq(vendors.organizationId, organization.id)))
      .limit(1);

    if (!vendor) {
      return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });
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
      .where(and(eq(purposes.id, purposeId), eq(purposes.organizationId, organization.id)))
      .limit(1);

    if (!purpose) {
      return NextResponse.json({ success: false, message: "Purpose not found" }, { status: 404 });
    }

    // Guard duplicate.
    const [existing] = await db
      .select({ id: vendorPurposes.id })
      .from(vendorPurposes)
      .where(and(eq(vendorPurposes.vendorId, vendor.id), eq(vendorPurposes.purposeId, purposeId)))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Purpose is already linked to this vendor" },
        { status: 409 },
      );
    }

    const [link] = await db
      .insert(vendorPurposes)
      .values({ vendorId: vendor.id, purposeId })
      .returning();

    return NextResponse.json({ success: true, vendorPurpose: link }, { status: 201 });
  } catch (error) {
    console.error("Attach vendor purpose failed:", error);
    return NextResponse.json({ success: false, message: "Failed to attach purpose" }, { status: 500 });
  }
}
