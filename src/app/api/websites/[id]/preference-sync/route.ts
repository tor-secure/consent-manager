import { auth } from "@clerk/nextjs/server";
import { randomBytes } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { websitePreferenceSyncEndpoints } from "@/db/schema/website-preference-sync-endpoints";
import { websites } from "@/db/schema/websites";
import {
  resolveActiveMembership,
  resolveLocalOrganization,
  resolveLocalUser,
} from "@/lib/api-auth-helpers";
import { logger } from "@/lib/logger";
import { requireOperatorRole } from "@/lib/org-roles";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { assertSafeScanUrl, ScannerUrlError } from "@/lib/scanner/ssrf-guard";
import { encryptWebhookSigningSecret } from "@/lib/webhooks/secret-crypto";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateSigningSecret(): string {
  return `whsec_${randomBytes(32).toString("base64url")}`;
}

function isMissingRelationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  return (
    code === "42P01" ||
    (/website_preference_sync_/i.test(message) &&
      /does not exist|relation/i.test(message))
  );
}

function schemaMissingResponse() {
  return NextResponse.json(
    {
      success: false,
      message:
        "Preference sync tables are missing. Run npm run db:ensure-schema (or apply scripts/neon-ensure-schema.sql) on this database, then retry.",
    },
    { status: 503 },
  );
}

function encryptionConfigResponse(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/WEBHOOK_SECRET_ENCRYPTION_KEY|POLICY_CONTEXT_SECRET/i.test(message)) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Server signing-secret encryption is not configured. Set WEBHOOK_SECRET_ENCRYPTION_KEY or POLICY_CONTEXT_SECRET.",
      },
      { status: 503 },
    );
  }
  return null;
}

async function authorizeWebsite(websiteId: string) {
  const { isAuthenticated, userId, orgId } = await auth();
  if (!isAuthenticated || !userId) {
    return { error: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }) };
  }
  if (!orgId) {
    return {
      error: NextResponse.json(
        { success: false, message: "No active organization selected" },
        { status: 400 },
      ),
    };
  }
  const localUser = await resolveLocalUser(userId);
  if (!localUser) {
    return { error: NextResponse.json({ success: false, message: "User not found" }, { status: 404 }) };
  }
  const organization = await resolveLocalOrganization(orgId);
  if (!organization) {
    return {
      error: NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 }),
    };
  }
  const membership = await resolveActiveMembership(organization.id, localUser.id);
  if (!membership) {
    return {
      error: NextResponse.json(
        { success: false, message: "You do not belong to this organization." },
        { status: 403 },
      ),
    };
  }
  const operatorError = requireOperatorRole(membership.roleName);
  if (operatorError) return { error: operatorError };

  if (!UUID_RE.test(websiteId)) {
    return {
      error: NextResponse.json({ success: false, message: "Invalid website id" }, { status: 400 }),
    };
  }

  const [website] = await db
    .select({ id: websites.id, organizationId: websites.organizationId })
    .from(websites)
    .where(
      and(
        eq(websites.id, websiteId),
        eq(websites.organizationId, organization.id),
        isNull(websites.deletedAt),
      ),
    )
    .limit(1);

  if (!website) {
    return {
      error: NextResponse.json({ success: false, message: "Website not found" }, { status: 404 }),
    };
  }

  return { localUser, organization, website, userId, orgId };
}

function publicEndpoint(row: typeof websitePreferenceSyncEndpoints.$inferSelect) {
  return {
    id: row.id,
    websiteId: row.websiteId,
    url: row.url,
    status: row.status,
    lastDeliveryAt: row.lastDeliveryAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    hasSigningSecret: Boolean(row.signingSecretEnc),
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const authz = await authorizeWebsite(id);
    if ("error" in authz && authz.error) return authz.error;
    if (!("website" in authz) || !("organization" in authz)) {
      return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
    }

    const [endpoint] = await db
      .select()
      .from(websitePreferenceSyncEndpoints)
      .where(
        and(
          eq(websitePreferenceSyncEndpoints.websiteId, authz.website.id),
          eq(websitePreferenceSyncEndpoints.organizationId, authz.organization.id),
        ),
      )
      .limit(1);

    return NextResponse.json({
      success: true,
      endpoint: endpoint ? publicEndpoint(endpoint) : null,
    });
  } catch (error) {
    logger.error("Preference sync GET failed", { operation: "preference_sync.get", error });
    if (isMissingRelationError(error)) return schemaMissingResponse();
    return NextResponse.json(
      { success: false, message: "Unable to load preference sync settings." },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const authz = await authorizeWebsite(id);
    if ("error" in authz && authz.error) return authz.error;
    if (!("website" in authz) || !("organization" in authz) || !("userId" in authz) || !("orgId" in authz)) {
      return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
    }

    const limit = rateLimit({
      key: `preference-sync:${authz.orgId}:${authz.userId}:${getClientIp(request)}`,
      limit: 40,
      windowMs: 60 * 60_000,
    });
    if (!limit.allowed) return rateLimitResponse(limit);

    const body = await request.json();
    const url = String(body.url ?? "").trim();
    if (!url) {
      return NextResponse.json(
        { success: false, message: "Preference sync URL is required" },
        { status: 400 },
      );
    }

    try {
      const parsed = await assertSafeScanUrl(url);
      if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
        return NextResponse.json(
          { success: false, message: "Preference sync URL must use HTTPS" },
          { status: 400 },
        );
      }
    } catch (urlError) {
      if (urlError instanceof ScannerUrlError) {
        return NextResponse.json(
          {
            success: false,
            message: "Preference sync URL must point to a publicly reachable host",
          },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { success: false, message: "Preference sync URL must be a valid HTTP/HTTPS URL" },
        { status: 400 },
      );
    }

    const statusRaw = String(body.status ?? "active").trim().toLowerCase();
    const status = statusRaw === "disabled" ? "disabled" : "active";
    const regenerateSecret = body.regenerateSecret === true;

    const [existing] = await db
      .select()
      .from(websitePreferenceSyncEndpoints)
      .where(
        and(
          eq(websitePreferenceSyncEndpoints.websiteId, authz.website.id),
          eq(websitePreferenceSyncEndpoints.organizationId, authz.organization.id),
        ),
      )
      .limit(1);

    const now = new Date();
    let signingSecret: string | null = null;
    let endpoint: typeof websitePreferenceSyncEndpoints.$inferSelect;

    if (!existing || regenerateSecret) {
      signingSecret = generateSigningSecret();
    }

    if (existing) {
      const [updated] = await db
        .update(websitePreferenceSyncEndpoints)
        .set({
          url,
          status,
          ...(signingSecret
            ? { signingSecretEnc: encryptWebhookSigningSecret(signingSecret) }
            : {}),
          updatedAt: now,
        })
        .where(eq(websitePreferenceSyncEndpoints.id, existing.id))
        .returning();
      endpoint = updated;
    } else {
      if (!signingSecret) signingSecret = generateSigningSecret();
      const [created] = await db
        .insert(websitePreferenceSyncEndpoints)
        .values({
          organizationId: authz.organization.id,
          websiteId: authz.website.id,
          url,
          status,
          signingSecretEnc: encryptWebhookSigningSecret(signingSecret),
        })
        .returning();
      endpoint = created;
    }

    return NextResponse.json({
      success: true,
      signingSecret,
      endpoint: publicEndpoint(endpoint),
    });
  } catch (error) {
    logger.error("Preference sync PUT failed", { operation: "preference_sync.put", error });
    if (isMissingRelationError(error)) return schemaMissingResponse();
    const encryptionError = encryptionConfigResponse(error);
    if (encryptionError) return encryptionError;
    return NextResponse.json(
      { success: false, message: "Failed to save preference sync settings" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const authz = await authorizeWebsite(id);
    if ("error" in authz && authz.error) return authz.error;
    if (!("website" in authz) || !("organization" in authz) || !("userId" in authz) || !("orgId" in authz)) {
      return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
    }

    const limit = rateLimit({
      key: `preference-sync-delete:${authz.orgId}:${authz.userId}:${getClientIp(request)}`,
      limit: 20,
      windowMs: 60 * 60_000,
    });
    if (!limit.allowed) return rateLimitResponse(limit);

    await db
      .delete(websitePreferenceSyncEndpoints)
      .where(
        and(
          eq(websitePreferenceSyncEndpoints.websiteId, authz.website.id),
          eq(websitePreferenceSyncEndpoints.organizationId, authz.organization.id),
        ),
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Preference sync DELETE failed", { operation: "preference_sync.delete", error });
    if (isMissingRelationError(error)) return schemaMissingResponse();
    return NextResponse.json(
      { success: false, message: "Failed to remove preference sync endpoint" },
      { status: 500 },
    );
  }
}
