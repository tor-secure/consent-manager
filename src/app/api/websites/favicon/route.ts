import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { resolveActiveClerkOrgId, resolveLocalOrganization } from "@/lib/api-auth-helpers";
import { logger } from "@/lib/logger";
import { isPublicHostname, resolveSiteFavicon } from "@/lib/site-favicon";

export const runtime = "nodejs";

function notFound() {
  return new NextResponse(null, {
    status: 404,
    headers: { "Cache-Control": "private, max-age=3600" },
  });
}

export async function GET(request: Request) {
  try {
    const { isAuthenticated, userId, orgId: sessionOrgId } = await auth();
    if (!isAuthenticated || !userId) return notFound();

    const host = new URL(request.url).searchParams.get("domain")?.trim().toLowerCase() ?? "";
    if (!isPublicHostname(host)) return notFound();

    const orgId = await resolveActiveClerkOrgId(userId, sessionOrgId);
    if (!orgId) return notFound();
    const organization = await resolveLocalOrganization(orgId);
    if (!organization) return notFound();

    const [owned] = await db
      .select({ id: websites.id })
      .from(websites)
      .where(and(eq(websites.organizationId, organization.id), eq(websites.domain, host)))
      .limit(1);
    if (!owned) return notFound();

    const iconUrl = await resolveSiteFavicon(host);
    if (!iconUrl) return notFound();

    const redirect = NextResponse.redirect(iconUrl, 302);
    redirect.headers.set("Cache-Control", "private, max-age=86400");
    return redirect;
  } catch (error) {
    logger.error("Favicon lookup failed", { error });
    return notFound();
  }
}
