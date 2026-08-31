import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { vendors } from "@/db/schema/vendors";
import { purposes } from "@/db/schema/purposes";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import { resolveLocalOrganization, resolveLocalUser, resolveActiveMembership } from "@/lib/api-auth-helpers";

// ---------------------------------------------------------------------------
// DELETE /api/vendors/[id]/purposes/[purposeId]
// Detaches a purpose from a vendor.
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; purposeId: string }> },
) {
  try {
    const { id: vendorId, purposeId } = await params;
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

    // Verify purpose belongs to this org before detaching.
    const [purpose] = await db
      .select({ id: purposes.id })
      .from(purposes)
      .where(and(eq(purposes.id, purposeId), eq(purposes.organizationId, organization.id)))
      .limit(1);

    if (!purpose) {
      return NextResponse.json({ success: false, message: "Purpose not found" }, { status: 404 });
    }

    const deleted = await db
      .delete(vendorPurposes)
      .where(
        and(
          eq(vendorPurposes.vendorId, vendor.id),
          eq(vendorPurposes.purposeId, purposeId),
        ),
      )
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { success: false, message: "Purpose is not linked to this vendor" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Detach vendor purpose failed:", error);
    return NextResponse.json({ success: false, message: "Failed to detach purpose" }, { status: 500 });
  }
}
