import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { crawlPages } from "@/db/schema/crawl-pages";
import { scans } from "@/db/schema/scans";
import { websites } from "@/db/schema/websites";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";

type Snapshot = { pages: Set<string>; destinations: Set<string>; cookies: Set<string>; resourceTypes: Set<string> };
function changes(current: Set<string>, previous: Set<string>) { return { added: [...current].filter((item) => !previous.has(item)), removed: [...previous].filter((item) => !current.has(item)) }; }
export async function GET(request: Request, { params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params; const previousId = new URL(request.url).searchParams.get("previousScanId");
  if (!previousId) return NextResponse.json({ success: false, message: "previousScanId is required" }, { status: 400 });
  const { isAuthenticated, userId, orgId } = await auth(); if (!isAuthenticated || !userId || !orgId) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const [user, org] = await Promise.all([resolveLocalUser(userId), resolveLocalOrganization(orgId)]); if (!user || !org || !(await resolveActiveMembership(org.id, user.id))) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const rows = await db.select({ id: scans.id, websiteId: scans.websiteId, status: scans.status }).from(scans).innerJoin(websites, eq(scans.websiteId, websites.id)).where(and(eq(websites.organizationId, org.id), eq(scans.scanType, "browser")));
  const current = rows.find((row) => row.id === scanId); const previous = rows.find((row) => row.id === previousId);
  if (!current || !previous || current.websiteId !== previous.websiteId) return NextResponse.json({ success: false, message: "Scans not found" }, { status: 404 });
  if (current.status !== "completed" || previous.status !== "completed") return NextResponse.json({ success: false, message: "Only completed scans can be compared" }, { status: 409 });
  const [currentPages, previousPages] = await Promise.all([db.select({ url: crawlPages.normalizedUrl }).from(crawlPages).where(eq(crawlPages.scanId, scanId)), db.select({ url: crawlPages.normalizedUrl }).from(crawlPages).where(eq(crawlPages.scanId, previousId))]);
  const snapshots = await Promise.all([snapshot(current.websiteId, scanId), snapshot(previous.websiteId, previousId)]); const [now, before] = snapshots;
  return NextResponse.json({ success: true, evidenceStatus: "observed", pages: changes(new Set(currentPages.map((row) => row.url)), new Set(previousPages.map((row) => row.url))), destinations: changes(now.destinations, before.destinations), cookies: changes(now.cookies, before.cookies), resourceTypes: changes(now.resourceTypes, before.resourceTypes), trackers: { added: [], removed: [], note: "Tracker mappings remain configured or inferred; this diff reports observed destinations." } });
}
async function snapshot(websiteId: string, scanId: string): Promise<Snapshot> {
  const { runtimeDiscoveryObservations } = await import("@/db/schema/runtime-discovery-observations");
  const observations = await db.select({ destination: runtimeDiscoveryObservations.destinationHost, storageKey: runtimeDiscoveryObservations.storageKey, type: runtimeDiscoveryObservations.resourceType, observationType: runtimeDiscoveryObservations.observationType, metadata: runtimeDiscoveryObservations.metadata }).from(runtimeDiscoveryObservations).where(and(eq(runtimeDiscoveryObservations.websiteId, websiteId), eq(runtimeDiscoveryObservations.discoverySource, "browser_crawler")));
  const scoped = observations.filter((row) => row.metadata?.scanId === scanId);
  return { pages: new Set(), destinations: new Set(scoped.map((row) => row.destination).filter(Boolean) as string[]), cookies: new Set(scoped.filter((row) => row.observationType === "cookie").map((row) => row.storageKey).filter(Boolean) as string[]), resourceTypes: new Set(scoped.map((row) => row.type).filter(Boolean) as string[]) };
}
