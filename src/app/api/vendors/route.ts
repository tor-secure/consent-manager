import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { vendors } from "@/db/schema/vendors";
import {
  resolveLocalOrganization,
  resolveLocalUser,
  resolveActiveMembership,
} from "@/lib/api-auth-helpers";
import { parseVendorRole, parseDpaStatus, parseDownstreamDsarMode, parseStringList, PROCESSING_AUDIT_ACTIONS } from "@/lib/processing/types";
import { parseCcpaApplicability } from "@/lib/ccpa/types";
import { writeProcessingAudit } from "@/lib/processing/service";

const VALID_STATUSES = ["active", "inactive", "archived"] as const;
const VALID_SOURCES = ["custom", "iab", "google"] as const;

export async function GET() {
  try {
    const { isAuthenticated, userId, orgId } = await auth();
    if (!isAuthenticated || !userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (!orgId) {
      return NextResponse.json({ success: false, message: "No active organization selected" }, { status: 400 });
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

    const rows = await db
      .select()
      .from(vendors)
      .where(eq(vendors.organizationId, organization.id))
      .orderBy(vendors.name);

    return NextResponse.json({ success: true, vendors: rows });
  } catch (error) {
    console.error("Vendor list failed:", error);
    return NextResponse.json({ success: false, message: "Failed to list vendors" }, { status: 500 });
  }
}

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

    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json(
        { success: false, message: "Vendor name is required" },
        { status: 400 },
      );
    }

    // Derive key from name if not supplied.
    const rawKey = body.key
      ? String(body.key).trim()
      : name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    const key = rawKey.slice(0, 150);

    if (!key) {
      return NextResponse.json(
        { success: false, message: "Vendor key is required" },
        { status: 400 },
      );
    }

    // Enforce key uniqueness per org at the application layer.
    const [existing] = await db
      .select({ id: vendors.id })
      .from(vendors)
      .where(
        and(
          eq(vendors.organizationId, organization.id),
          eq(vendors.key, key),
        ),
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: `A vendor with key "${key}" already exists in this organization.`,
        },
        { status: 409 },
      );
    }

    const domain = body.domain ? String(body.domain).trim() || null : null;
    const websiteUrl = body.websiteUrl ? String(body.websiteUrl).trim() || null : null;
    const privacyPolicyUrl = body.privacyPolicyUrl
      ? String(body.privacyPolicyUrl).trim() || null
      : null;
    const country = body.country ? String(body.country).trim() || null : null;
    const description = body.description ? String(body.description).trim() || null : null;

    const status = VALID_STATUSES.includes(body.status)
      ? (body.status as (typeof VALID_STATUSES)[number])
      : "active";

    const source = VALID_SOURCES.includes(body.source)
      ? (body.source as (typeof VALID_SOURCES)[number])
      : "custom";

    const [vendor] = await db
      .insert(vendors)
      .values({
        organizationId: organization.id,
        name,
        key,
        domain,
        websiteUrl,
        privacyPolicyUrl,
        country,
        description,
        status: status === "archived" ? "active" : status,
        source,
        legalName: body.legalName ? String(body.legalName).trim() || null : null,
        role: parseVendorRole(body.role),
        processingCountries: parseStringList(body.processingCountries),
        dpaStatus: parseDpaStatus(body.dpaStatus),
        dpaReference: body.dpaReference ? String(body.dpaReference).trim() || null : null,
        downstreamDsarMode: parseDownstreamDsarMode(body.downstreamDsarMode),
        ccpaSale: parseCcpaApplicability(body.ccpaSale),
        ccpaShare: parseCcpaApplicability(body.ccpaShare),
        ccpaSensitivePi: parseCcpaApplicability(body.ccpaSensitivePi),
      })
      .returning();

    await writeProcessingAudit({
      organizationId: organization.id,
      userId: localUser.id,
      action: PROCESSING_AUDIT_ACTIONS.vendorCreated,
      resourceType: "vendor",
      resourceId: vendor.id,
      description: `Created vendor ${vendor.name}`,
    });

    return NextResponse.json({ success: true, vendor }, { status: 201 });
  } catch (error) {
    console.error("Vendor creation failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create vendor" },
      { status: 500 },
    );
  }
}
