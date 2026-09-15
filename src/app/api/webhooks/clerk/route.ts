import { NextResponse } from "next/server";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { users } from "@/db/schema/users";
import { verifyClerkSvixSignature } from "@/lib/clerk-webhook";
import {
  deactivateMembership,
  ensureMembershipForClerkRole,
} from "@/lib/local-membership";
import { logger } from "@/lib/logger";
import { claimInboundWebhook, releaseInboundWebhook } from "@/lib/webhooks/inbound-idempotency";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

function webhookSecret(): string | null {
  const secret = process.env.CLERK_WEBHOOK_SECRET?.trim() || "";
  return secret.length >= 16 ? secret : null;
}

async function resolveLocalIds(clerkOrgId: string | undefined, clerkUserId: string | undefined) {
  const [organization, user] = await Promise.all([
    clerkOrgId
      ? db
          .select({ id: organizations.id })
          .from(organizations)
          .where(eq(organizations.clerkOrganizationId, clerkOrgId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : null,
    clerkUserId
      ? db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.clerkUserId, clerkUserId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : null,
  ]);
  return { organization, user };
}

export async function POST(request: Request) {
  const secret = webhookSecret();
  if (!secret) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.text();
  const ok = verifyClerkSvixSignature({
    payload,
    svixId: request.headers.get("svix-id"),
    svixTimestamp: request.headers.get("svix-timestamp"),
    svixSignature: request.headers.get("svix-signature"),
    secret,
  });
  if (!ok) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const svixId = request.headers.get("svix-id")?.trim();
  if (!svixId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const claimed = await claimInboundWebhook({ provider: "clerk", eventId: svixId });
  if (!claimed.claimed) {
    return NextResponse.json({ success: true, duplicate: true });
  }

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(payload) as { type?: string; data?: Record<string, unknown> };
  } catch {
    await releaseInboundWebhook("clerk", svixId);
    return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }

  const data = event.data ?? {};
  const organization = data.organization as { id?: string } | undefined;
  const publicUserData = data.public_user_data as { user_id?: string } | undefined;
  const clerkOrgId =
    typeof data.organization_id === "string"
      ? data.organization_id
      : organization?.id;
  const clerkUserId =
    typeof data.user_id === "string"
      ? data.user_id
      : publicUserData?.user_id;
  const clerkRole = typeof data.role === "string" ? data.role : null;

  try {
    if (
      event.type === "organizationMembership.created" ||
      event.type === "organizationMembership.updated"
    ) {
      const ids = await resolveLocalIds(clerkOrgId, clerkUserId);
      if (ids.organization && ids.user) {
        await ensureMembershipForClerkRole({
          organizationId: ids.organization.id,
          userId: ids.user.id,
          clerkRole,
          syncRole: true,
        });
      }
    }

    if (event.type === "organizationMembership.deleted") {
      const ids = await resolveLocalIds(clerkOrgId, clerkUserId);
      if (ids.organization && ids.user) {
        await deactivateMembership(ids.organization.id, ids.user.id);
      }
    }

    if (event.type === "user.deleted" && clerkUserId) {
      await db
        .update(users)
        .set({ status: "deleted", deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(users.clerkUserId, clerkUserId));
    }

    if (event.type === "user.updated" && clerkUserId) {
      const email =
        typeof data.email_addresses === "object" && Array.isArray(data.email_addresses)
          ? String((data.email_addresses[0] as { email_address?: string } | undefined)?.email_address ?? "")
          : "";
      const name = typeof data.first_name === "string" || typeof data.last_name === "string"
        ? `${String(data.first_name ?? "")} ${String(data.last_name ?? "")}`.trim()
        : "";
      await db
        .update(users)
        .set({
          ...(email ? { email } : {}),
          ...(name ? { name } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.clerkUserId, clerkUserId));
    }

    if (event.type === "organization.deleted" && clerkOrgId) {
      await db
        .update(organizations)
        .set({ status: "deleted", deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(organizations.clerkOrganizationId, clerkOrgId));
    }

    if (event.type === "organization.updated" && clerkOrgId) {
      const name = typeof data.name === "string" ? data.name : "";
      if (name) {
        await db
          .update(organizations)
          .set({ name, updatedAt: new Date() })
          .where(eq(organizations.clerkOrganizationId, clerkOrgId));
      }
    }
  } catch (error) {
    await releaseInboundWebhook("clerk", svixId);
    logger.error("Clerk webhook handling failed", {
      operation: "clerk.webhook",
      type: event.type,
      error,
    });
    return NextResponse.json({ success: false, message: "Webhook handling failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
