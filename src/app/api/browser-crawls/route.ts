import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { scans } from "@/db/schema/scans";
import { websites } from "@/db/schema/websites";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import { requireOperatorRole } from "@/lib/org-roles";
import { browserCrawlConfigSchema, crawlerEgressGuardEnabled, queueBrowserCrawl } from "@/lib/scanner/browser-crawler";

async function organizationForRequest() {
  const { isAuthenticated, userId, orgId } = await auth();
  if (!isAuthenticated || !userId || !orgId) return null;
  const [user, organization] = await Promise.all([resolveLocalUser(userId), resolveLocalOrganization(orgId)]);
  if (!user || !organization) return null;
  const membership = await resolveActiveMembership(organization.id, user.id);
  return membership ? { organization, membership } : null;
}

export async function GET() {
  const context = await organizationForRequest();
  if (!context) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const sites = await db.select({ id: websites.id }).from(websites).where(eq(websites.organizationId, context.organization.id));
  const rows = sites.length ? await db.select().from(scans).where(and(inArray(scans.websiteId, sites.map((site) => site.id)), eq(scans.scanType, "browser"))).orderBy(desc(scans.createdAt)).limit(100) : [];
  return NextResponse.json({ success: true, scans: rows });
}

export async function POST(request: Request) {
  const context = await organizationForRequest();
  if (!context) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const roleError = requireOperatorRole(context.membership.roleName);
  if (roleError) return roleError;
  if (!crawlerEgressGuardEnabled(process.env.CONSENT_GURU_CRAWLER_EGRESS_RESTRICTED)) return NextResponse.json({ success: false, message: "Browser crawling is not enabled until outbound network restrictions are configured for its worker" }, { status: 503 });
  const body = await request.json().catch(() => null);
  const websiteId = typeof body?.websiteId === "string" ? body.websiteId : "";
  const parsed = browserCrawlConfigSchema.safeParse(body?.config ?? {});
  if (!websiteId || !parsed.success) return NextResponse.json({ success: false, message: "Invalid browser crawl configuration" }, { status: 400 });
  const [site] = await db.select({ id: websites.id, status: websites.status }).from(websites).where(and(eq(websites.id, websiteId), eq(websites.organizationId, context.organization.id))).limit(1);
  if (!site || site.status !== "active") return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
  const [active] = await db.select({ id: scans.id }).from(scans).where(and(eq(scans.websiteId, site.id), eq(scans.scanType, "browser"), inArray(scans.status, ["queued", "running"]))).limit(1);
  if (active) return NextResponse.json({ success: false, message: "A browser crawl is already active for this website" }, { status: 409 });
  const scan = await queueBrowserCrawl(site.id, parsed.data);
  return NextResponse.json({ success: true, scan }, { status: 201 });
}
