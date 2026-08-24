import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { memberships } from "@/db/schema/memberships";
import { users } from "@/db/schema/users";

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
    const domain = normalizeDomain(
      String(body.domain ?? ""),
    );
    const language = String(body.language ?? "en");
    const region = String(body.region ?? "IN");

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Website name is required",
        },
        { status: 400 },
      );
    }

    if (!domain) {
      return NextResponse.json(
        {
          success: false,
          message: "Website domain is required",
        },
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

    // Verify the user belongs to this organization.
    const [membership] = await db
      .select()
      .from(memberships)
      .where(
        eq(memberships.organizationId, organization.id),
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