import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import crypto from "node:crypto";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { memberships } from "@/db/schema/memberships";
import { users } from "@/db/schema/users";
import { parseStoredLocale } from "@/lib/i18n/locale-registry";

function normalizeDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
}

export async function POST(request: Request) {
  try {
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 },
      );
    }

    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          message: "No active organization selected",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const rawDomain = String(body.domain ?? "");
    const domain = normalizeDomain(rawDomain);
    const language = parseStoredLocale(body.language ?? "en") ?? "en";
    const region = String(body.region ?? "IN");

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Website name is required" },
        { status: 400 },
      );
    }

    if (name.length > 255) {
      return NextResponse.json(
        { success: false, message: "Website name must be 255 characters or fewer" },
        { status: 400 },
      );
    }

    if (!domain) {
      return NextResponse.json(
        { success: false, message: "Website domain is required" },
        { status: 400 },
      );
    }

    if (domain.length > 253) {
      return NextResponse.json(
        { success: false, message: "Domain must be 253 characters or fewer" },
        { status: 400 },
      );
    }

    // Basic hostname format check: must contain at least one dot and no spaces.
    if (!/^[a-z0-9]([a-z0-9\-\.]*[a-z0-9])?$/.test(domain)) {
      return NextResponse.json(
        { success: false, message: "Domain must be a valid hostname" },
        { status: 400 },
      );
    }

    // Resolve the Clerk organization to our local organization.
    const [organization] = await db
      .select()
      .from(organizations)
      .where(
        eq(
          organizations.clerkOrganizationId,
          orgId,
        ),
      )
      .limit(1);

    if (!organization) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Organization is not synchronized with the local database.",
        },
        { status: 400 },
      );
    }

    // Resolve the current local user.
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User is not synchronized with the database.",
        },
        { status: 400 },
      );
    }

    // Verify the user has an active membership in this specific organization.
    const [membership] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.organizationId, organization.id),
          eq(memberships.userId, user.id),
          eq(memberships.status, "active"),
        ),
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not belong to this organization.",
        },
        { status: 403 },
      );
    }

    const siteKey = `site_${crypto.randomBytes(24).toString("hex")}`;

    const [website] = await db
      .insert(websites)
      .values({
        organizationId: organization.id,
        name,
        domain,
        environment: "production",
        status: "active",
        siteKey,
        defaultLanguage: language,
        defaultRegion: region,
        verified: false,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        website,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Website creation failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create website",
      },
      { status: 500 },
    );
  }
}