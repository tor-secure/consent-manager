import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { integrations } from "@/db/schema/integrations";
import { websiteIntegrations } from "@/db/schema/website-integrations";
import { resolveLocalOrganization, resolveLocalUser, resolveActiveMembership } from "@/lib/api-auth-helpers";

// POST /api/integrations/connect
// Body: { integrationId: string; websiteId: string }
// Creates a website_integrations row. Duplicate is rejected via DB unique constraint
// (409 at application layer before it reaches the DB).
export async function POST(request: Request) {
  try {
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
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
    const integrationId = String(body.integrationId ?? "").trim();
    const websiteId = String(body.websiteId ?? "").trim();

    if (!integrationId || !websiteId) {
      return NextResponse.json(
        { success: false, message: "integrationId and websiteId are required" },
        { status: 400 },
      );
    }

    // Verify the website belongs to this org — tenant isolation.
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

    // Verify the integration exists and is active.
    const [integration] = await db
      .select({ id: integrations.id, name: integrations.name })
      .from(integrations)
      .where(
        and(
          eq(integrations.id, integrationId),
          eq(integrations.isActive, true),
        ),
      )
      .limit(1);

    if (!integration) {
      return NextResponse.json(
        { success: false, message: "Integration not found or is not active" },
        { status: 404 },
      );
    }

    // Check for duplicate connection at application layer.
    const [existing] = await db
      .select({ id: websiteIntegrations.id })
      .from(websiteIntegrations)
      .where(
        and(
          eq(websiteIntegrations.websiteId, website.id),
          eq(websiteIntegrations.integrationId, integration.id),
        ),
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: `"${integration.name}" is already connected to this website`,
        },
        { status: 409 },
      );
    }

    const [connection] = await db
      .insert(websiteIntegrations)
      .values({
        websiteId: website.id,
        integrationId: integration.id,
        status: "active",
        enabled: true,
        configuration: {},
        connectedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ success: true, connection }, { status: 201 });
  } catch (error) {
    console.error("Integration connect failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to connect integration" },
      { status: 500 },
    );
  }
}
