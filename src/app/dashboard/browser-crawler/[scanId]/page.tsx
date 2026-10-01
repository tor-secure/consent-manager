import { notFound } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { db } from "@/db";
import { crawlPages } from "@/db/schema/crawl-pages";
import { runtimeDiscoveryObservations } from "@/db/schema/runtime-discovery-observations";
import { scans } from "@/db/schema/scans";
import { websites } from "@/db/schema/websites";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ScanCompare } from "@/components/scanner/scan-compare";

export default async function BrowserCrawlDetail({ params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params;
  const context = await requireDashboardContext();
  const [result] = await db.select({ scan: scans, websiteName: websites.name }).from(scans)
    .innerJoin(websites, eq(scans.websiteId, websites.id))
    .where(and(eq(scans.id, scanId), eq(scans.scanType, "browser"), eq(websites.organizationId, context.organization.id))).limit(1);
  if (!result) notFound();

  const [pages, evidence, previousRows] = await Promise.all([
    db.select().from(crawlPages).where(and(eq(crawlPages.scanId, scanId), eq(crawlPages.websiteId, result.scan.websiteId))).orderBy(crawlPages.depth, crawlPages.url).limit(250),
    db.select().from(runtimeDiscoveryObservations).where(and(
      eq(runtimeDiscoveryObservations.organizationId, context.organization.id),
      eq(runtimeDiscoveryObservations.websiteId, result.scan.websiteId),
      eq(runtimeDiscoveryObservations.discoverySource, "browser_crawler"),
      sql`${runtimeDiscoveryObservations.metadata}->>'scanId' = ${scanId}`,
    )).orderBy(desc(runtimeDiscoveryObservations.observedAt)).limit(500),
    db.select({ id: scans.id, status: scans.status, createdAt: scans.createdAt }).from(scans)
      .innerJoin(websites, eq(scans.websiteId, websites.id))
      .where(and(eq(scans.websiteId, result.scan.websiteId), eq(scans.scanType, "browser"), eq(websites.organizationId, context.organization.id), eq(scans.status, "completed"), sql`${scans.id} <> ${scanId}`))
      .orderBy(desc(scans.createdAt)).limit(50),
  ]);
  const previousScans = previousRows.map((row) => ({ id: row.id, label: row.createdAt.toLocaleString() }));

  return <div className="page-wrap space-y-6">
    <PageHeader title="Browser crawl results" description={`${result.websiteName} · ${result.scan.status} · ${result.scan.pagesScanned} pages · ${result.scan.itemsDetected} observed events`} />
    {result.scan.status === "completed" && <Card><div className="p-4"><ScanCompare scanId={scanId} previousScans={previousScans} /></div></Card>}
    <Card><div className="card-section-header"><h2 className="font-semibold">Crawled pages</h2><span className="text-sm text-[var(--muted-foreground)]">{pages.length}</span></div><div className="space-y-2 p-4">{pages.map((page) => <div className="rounded border p-3 text-sm" key={page.id}><p className="break-all font-medium">{page.url}</p><p className="text-[var(--muted-foreground)]">Depth {page.depth} · {page.statusCode ?? page.errorMessage ?? "No response"} · {page.resourcesObserved} resources · {page.cookiesObserved} cookies</p></div>)}{pages.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">No pages have been recorded for this scan yet.</p>}</div></Card>
    <Card><div className="card-section-header"><h2 className="font-semibold">Observed evidence</h2><span className="text-xs text-[var(--muted-foreground)]">Observed by this browser crawl</span></div><div className="max-h-[36rem] space-y-2 overflow-auto p-4">{evidence.map((item) => <div className="rounded border p-3 text-sm" key={item.id}><p className="font-medium">{item.observationType} · {item.destinationHost ?? item.storageKey ?? "Unknown destination"}</p><p className="mt-1 break-all text-xs text-[var(--muted-foreground)]">{item.party} · {item.pageUrl} · {item.observedAt.toLocaleString()}</p></div>)}{evidence.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">No evidence has been recorded for this scan yet.</p>}</div></Card>
  </div>;
}
