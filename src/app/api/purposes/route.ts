import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { purposes } from "@/db/schema/purposes";

// Allowed status values.
const VALID_STATUSES = ["active", "inactive"] as const;

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

    // Resolve local org — never trust client-supplied IDs.
    const [organization] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.clerkOrganizationId, orgId))
      .limit(1);

    if (!organization) {
      return NextResponse.json(
        { success: false, message: "Organization not found" },
        { status: 404 },
      );
    }

    const body = await request.json();

    // Validate required fields.
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json(
        { success: false, message: "Purpose name is required" },
        { status: 400 },
      );
    }

    // key: slug-like identifier, derived from name if not supplied.
    const rawKey = body.key
      ? String(body.key).trim()
      : name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

    const key = rawKey.slice(0, 100);

    if (!key) {
      return NextResponse.json(
        { success: false, message: "Purpose key is required" },
        { status: 400 },
      );
    }

    // Enforce key uniqueness per org at the application layer (DB also has a
    // unique constraint, but a friendly message is better than a DB error).
    const [existing] = await db
      .select({ id: purposes.id })
      .from(purposes)
      .where(
        and(
          eq(purposes.organizationId, organization.id),
          eq(purposes.key, key),
        ),
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: `A purpose with key "${key}" already exists in this organization.`,
        },
        { status: 409 },
      );
    }

    const description = body.description
      ? String(body.description).trim()
      : null;

    const isRequired = body.isRequired === true;

    const status = VALID_STATUSES.includes(body.status)
      ? (body.status as (typeof VALID_STATUSES)[number])
      : "active";

    const [purpose] = await db
      .insert(purposes)
      .values({
        organizationId: organization.id,
        key,
        name,
        description,
        isRequired,
        status,
      })
      .returning();

    return NextResponse.json({ success: true, purpose }, { status: 201 });
  } catch (error) {
    console.error("Purpose creation failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create purpose" },
      { status: 500 },
    );
  }
}
