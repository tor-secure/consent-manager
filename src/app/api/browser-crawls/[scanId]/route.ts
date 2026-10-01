import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { crawlPages } from "@/db/schema/crawl-pages";
import { scans } from "@/db/schema/scans";
import { websites } from "@/db/schema/websites";
import { cancelBrowserCrawl } from "@/lib/scanner/browser-crawler";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import { requireOperatorRole } from "@/lib/org-roles";

async function owned(scanId: string) {
  const { isAuthenticated, userId, orgId } = await auth(); if (!isAuthenticated || !userId || !orgId) return null;
  const [user, organization] = await Promise.all([resolveLocalUser(userId), resolveLocalOrganization(orgId)]); if (!user || !organization) return null;
  const membership = await resolveActiveMembership(organization.id, user.id); if (!membership) return null;
  const [scan] = await db.select().from(scans).innerJoin(websites, eq(scans.websiteId, websites.id)).where(and(eq(scans.id, scanId), eq(scans.scanType, "browser"), eq(websites.organizationId, organization.id))).limit(1);
  return scan ? { scan: scan.scans, membership } : null;
}
export async function GET(_request: Request, { params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params; const result = await owned(scanId);
  if (!result) return NextResponse.json({ success: false, message: "Scan not found" }, { status: 404 });
  const pages = await db.select().from(crawlPages).where(eq(crawlPages.scanId, scanId)).limit(250);
  return NextResponse.json({ success: true, scan: result.scan, pages });
}
export async function DELETE(_request: Request, { params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params; const result = await owned(scanId);
  if (!result) return NextResponse.json({ success: false, message: "Scan not found" }, { status: 404 });
  const roleError = requireOperatorRole(result.membership.roleName); if (roleError) return roleError;
  await cancelBrowserCrawl(scanId); return NextResponse.json({ success: true });
}
