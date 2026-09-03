import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { auditLogs } from "@/db/schema/audit-logs";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { isRegulationKey } from "@/lib/regulations/catalog";
import {
  parseConsentIntegrations,
  serializeConsentIntegrations,
} from "@/lib/signals/consent-integrations";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authorizeWebsite(websiteId: string) {
  const { isAuthenticated, userId, orgId } = await auth();
  if (!isAuthenticated || !userId) {
    return { error: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }) };
  }
  if (!orgId) {
    return { error: NextResponse.json({ success: false, message: "No active organization selected" }, { status: 400 }) };
  }
  const localUser = await resolveLocalUser(userId);
  if (!localUser) {
    return { error: NextResponse.json({ success: false, message: "User not found" }, { status: 404 }) };
  }
  const organization = await resolveLocalOrganization(orgId);
  if (!organization) {
    return { error: NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 }) };
  }
  const membership = await resolveActiveMembership(organization.id, localUser.id);
  if (!membership) {
    return { error: NextResponse.json({ success: false, message: "You do not belong to this organization." }, { status: 403 }) };
  }
  if (!UUID_RE.test(websiteId)) {
    return { error: NextResponse.json({ success: false, message: "Invalid website id" }, { status: 400 }) };
  }
  const [website] = await db
    .select({
      id: websites.id,
      defaultRegulationKey: websites.defaultRegulationKey,
      consentIntegrations: websites.consentIntegrations,
    })
    .from(websites)
    .where(and(eq(websites.id, websiteId), eq(websites.organizationId, organization.id)))
    .limit(1);
  if (!website) {
    return { error: NextResponse.json({ success: false, message: "Website not found" }, { status: 404 }) };
  }
  return { localUser, organization, website };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const authz = await authorizeWebsite(id);
    if ("error" in authz && authz.error) return authz.error;
    if (!("website" in authz)) {
      return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      defaultRegulationKey: authz.website.defaultRegulationKey,
      integrations: parseConsentIntegrations(authz.website.consentIntegrations),
    });
  } catch {
    return NextResponse.json({ success: false, message: "Unable to load consent integrations." }, { status: 500 });
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
    if (!("website" in authz) || !("organization" in authz) || !("localUser" in authz)) {
      return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
    }

    const { orgId, userId } = await auth();
    const limit = rateLimit({
      key: `consent-integrations:${orgId}:${userId}:${getClientIp(request)}`,
      limit: 60,
      windowMs: 60 * 60_000,
    });
    if (!limit.allowed) return rateLimitResponse(limit);

    const body = await request.json();
    const parsed = parseConsentIntegrations(body.integrations ?? body);
    let defaultRegulationKey: string | null = authz.website.defaultRegulationKey;
    if (body.defaultRegulationKey === null || body.defaultRegulationKey === "") {
      defaultRegulationKey = null;
    } else if (typeof body.defaultRegulationKey === "string") {
      if (!isRegulationKey(body.defaultRegulationKey)) {
        return NextResponse.json({ success: false, message: "Invalid regulation key" }, { status: 400 });
      }
      defaultRegulationKey = body.defaultRegulationKey;
    }

    await db
      .update(websites)
      .set({
        defaultRegulationKey,
        consentIntegrations: serializeConsentIntegrations(parsed),
        updatedAt: new Date(),
      })
      .where(and(eq(websites.id, authz.website.id), eq(websites.organizationId, authz.organization.id)));

    await db.insert(auditLogs).values({
      organizationId: authz.organization.id,
      userId: authz.localUser.id,
      action: "website.consent_integrations.updated",
      resourceType: "website",
      resourceId: authz.website.id,
      description: "Updated website regulation and consent integrations",
    });

    return NextResponse.json({
      success: true,
      defaultRegulationKey,
      integrations: parsed,
    });
  } catch {
    return NextResponse.json({ success: false, message: "Unable to save consent integrations." }, { status: 500 });
  }
}
