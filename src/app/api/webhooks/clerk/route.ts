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

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(payload) as { type?: string; data?: Record<string, unknown> };
  } catch {
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
  } catch (error) {
    logger.error("Clerk webhook handling failed", {
      operation: "clerk.webhook",
      type: event.type,
      error,
    });
    return NextResponse.json({ success: false, message: "Webhook handling failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
