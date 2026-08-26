import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";

// Allowed environment values — validated server-side, never trusted from body.
const VALID_ENVIRONMENTS = ["production", "staging", "development"] as const;
const VALID_LANGUAGES = ["en", "hi", "kn", "fr", "de", "es", "pt"] as const;
const VALID_REGIONS = ["IN", "EU", "US", "UK", "AU", "CA"] as const;

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

    // Resolve local org from Clerk — never trust client-supplied org IDs.
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

    // Verify the website exists AND belongs to this org — tenant isolation.
    const [existing] = await db
      .select({ id: websites.id })
      .from(websites)
      .where(
        and(
          eq(websites.id, id),
          eq(websites.organizationId, organization.id),
        ),
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Website not found" },
        { status: 404 },
      );
    }

    const body = await request.json();

    // Sanitize and validate each editable field individually.
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json(
        { success: false, message: "Website name is required" },
        { status: 400 },
      );
    }

    const description = body.description
      ? String(body.description).trim()
      : null;

    const environment = VALID_ENVIRONMENTS.includes(body.environment)
      ? (body.environment as (typeof VALID_ENVIRONMENTS)[number])
      : null;

    if (!environment) {
      return NextResponse.json(
        {
          success: false,
          message: `Environment must be one of: ${VALID_ENVIRONMENTS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const defaultLanguage = VALID_LANGUAGES.includes(body.defaultLanguage)
      ? (body.defaultLanguage as (typeof VALID_LANGUAGES)[number])
      : null;

    if (!defaultLanguage) {
      return NextResponse.json(
        {
          success: false,
          message: `Language must be one of: ${VALID_LANGUAGES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const defaultRegion =
      body.defaultRegion && VALID_REGIONS.includes(body.defaultRegion)
        ? (body.defaultRegion as (typeof VALID_REGIONS)[number])
        : null;

    // Apply update — domain and siteKey are intentionally excluded (immutable).
    const [updated] = await db
      .update(websites)
      .set({
        name,
        description,
        environment,
        defaultLanguage,
        defaultRegion,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(websites.id, id),
          eq(websites.organizationId, organization.id),
        ),
      )
      .returning();

    return NextResponse.json({ success: true, website: updated });
  } catch (error) {
    console.error("Website update failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update website" },
      { status: 500 },
    );
  }
}
