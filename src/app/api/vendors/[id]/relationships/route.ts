import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { vendorRelationships } from "@/db/schema/processing-inventory";
import {
  authorizeProcessingOrganization,
  loadOwnedVendorRecord,
} from "@/lib/processing/http";
import { parseRelationshipWrite } from "@/lib/processing/parse";
import { writeProcessingAudit } from "@/lib/processing/service";
import { PROCESSING_AUDIT_ACTIONS } from "@/lib/processing/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await authorizeProcessingOrganization();
  if ("error" in authz) return authz.error;
  const { id } = await params;
  const parent = await loadOwnedVendorRecord(authz.organization.id, id);
  if (!parent) {
    return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });
  }
  const parsed = parseRelationshipWrite({
    parentVendorId: parent.id,
    ...(await request.json() as Record<string, unknown>),
  });
  if (!parsed.childVendorId || !parsed.relationshipType) {
    return NextResponse.json({ success: false, message: "childVendorId and relationshipType are required" }, { status: 400 });
  }
  if (parsed.childVendorId === parent.id) {
    return NextResponse.json({ success: false, message: "A vendor cannot be its own processor relationship" }, { status: 400 });
  }
  const child = await loadOwnedVendorRecord(authz.organization.id, parsed.childVendorId);
  if (!child) {
    return NextResponse.json({ success: false, message: "Related vendor not found" }, { status: 404 });
  }

  const [created] = await db
    .insert(vendorRelationships)
    .values({
      organizationId: authz.organization.id,
      parentVendorId: parent.id,
      childVendorId: child.id,
      relationshipType: parsed.relationshipType,
      status: parsed.status === "archived" ? "active" : parsed.status,
    })
    .returning();

  await writeProcessingAudit({
    organizationId: authz.organization.id,
    userId: authz.localUser.id,
    action: PROCESSING_AUDIT_ACTIONS.relationshipCreated,
    resourceType: "vendor_relationship",
    resourceId: created.id,
    description: `Linked ${child.name} as ${parsed.relationshipType}`,
    metadata: { parentVendorId: parent.id, childVendorId: child.id },
  });

  return NextResponse.json({ success: true, relationship: created }, { status: 201 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await authorizeProcessingOrganization();
  if ("error" in authz) return authz.error;
  const { id } = await params;
  const parent = await loadOwnedVendorRecord(authz.organization.id, id);
  if (!parent) {
    return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });
  }
  const body = await request.json() as Record<string, unknown>;
  const relationshipId = String(body.id ?? "").trim();
  const [existing] = await db
    .select()
    .from(vendorRelationships)
    .where(
      and(
        eq(vendorRelationships.id, relationshipId),
        eq(vendorRelationships.organizationId, authz.organization.id),
        eq(vendorRelationships.parentVendorId, parent.id),
      ),
    )
    .limit(1);
  if (!existing) {
    return NextResponse.json({ success: false, message: "Relationship not found" }, { status: 404 });
  }
  const parsed = parseRelationshipWrite({ ...existing, ...body });
  const [updated] = await db
    .update(vendorRelationships)
    .set({
      relationshipType: parsed.relationshipType ?? existing.relationshipType,
      status: parsed.status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(vendorRelationships.id, existing.id),
        eq(vendorRelationships.organizationId, authz.organization.id),
      ),
    )
    .returning();
  await writeProcessingAudit({
    organizationId: authz.organization.id,
    userId: authz.localUser.id,
    action: PROCESSING_AUDIT_ACTIONS.relationshipUpdated,
    resourceType: "vendor_relationship",
    resourceId: updated.id,
    description: "Updated vendor relationship",
  });
  return NextResponse.json({ success: true, relationship: updated });
}
