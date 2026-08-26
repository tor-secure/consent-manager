import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { webhookEndpoints } from "@/db/schema/webhook-endpoints";

// All supported event types — validated server-side, never trusted from body.
export const WEBHOOK_EVENT_TYPES = [
  "consent.granted",
  "consent.declined",
  "consent.withdrawn",
  "policy.created",
  "policy.published",
  "policy.archived",
  "website.created",
  "website.updated",
  "scan.completed",
  "tracker.detected",
] as const;

function generateSigningSecret(): { raw: string; hash: string } {
  const secret = randomBytes(32).toString("base64url");
  const raw = `whsec_${secret}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

// POST /api/webhooks/endpoints — create a new webhook endpoint.
export async function POST(request: Request) {
  try {
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

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

    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json(
        { success: false, message: "Endpoint name is required" },
        { status: 400 },
      );
    }

    const url = String(body.url ?? "").trim();
    if (!url) {
      return NextResponse.json(
        { success: false, message: "Endpoint URL is required" },
        { status: 400 },
      );
    }

    // Validate URL format.
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Protocol must be http or https");
      }
    } catch {
      return NextResponse.json(
        { success: false, message: "Endpoint URL must be a valid HTTP/HTTPS URL" },
        { status: 400 },
      );
    }

    const description = body.description
      ? String(body.description).trim() || null
      : null;

    // Validate subscribed events — only allow known event types.
    const rawEvents: unknown[] = Array.isArray(body.subscribedEvents)
      ? body.subscribedEvents
      : [];
    const validEventSet = new Set<string>(WEBHOOK_EVENT_TYPES);
    const subscribedEvents = rawEvents
      .map((e) => String(e))
      .filter((e) => validEventSet.has(e));

    // Check for duplicate URL within this org.
    const [existing] = await db
      .select({ id: webhookEndpoints.id })
      .from(webhookEndpoints)
      .where(
        and(
          eq(webhookEndpoints.organizationId, organization.id),
          eq(webhookEndpoints.url, url),
        ),
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { success: false, message: "An endpoint with this URL already exists" },
        { status: 409 },
      );
    }

    const { raw: signingSecret, hash: signingSecretHash } =
      generateSigningSecret();

    const [endpoint] = await db
      .insert(webhookEndpoints)
      .values({
        organizationId: organization.id,
        name,
        url,
        description,
        subscribedEvents,
        signingSecretHash,
        status: "active",
        verified: false,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        // Raw secret returned ONCE — caller must display it immediately.
        signingSecret,
        endpoint: {
          id: endpoint.id,
          name: endpoint.name,
          url: endpoint.url,
          status: endpoint.status,
          subscribedEvents: endpoint.subscribedEvents,
          createdAt: endpoint.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Webhook endpoint creation failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create webhook endpoint" },
      { status: 500 },
    );
  }
}
