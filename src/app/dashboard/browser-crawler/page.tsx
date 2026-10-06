import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { scans } from "@/db/schema/scans";
import { websites } from "@/db/schema/websites";
import { BrowserCrawlForm } from "@/components/scanner/browser-crawl-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionEyebrow } from "@/components/dashboard/section-eyebrow";

export default async function BrowserCrawlerPage() {
  const { orgId } = await auth(); if (!orgId) return null;
  const [org] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.clerkOrganizationId, orgId)).limit(1); if (!org) return null;
  const sites = await db.select({ id: websites.id, name: websites.name, domain: websites.domain }).from(websites).where(eq(websites.organizationId, org.id)).orderBy(websites.name);
  const rows = sites.length ? await db.select().from(scans).where(inArray(scans.websiteId, sites.map((site) => site.id))).orderBy(desc(scans.createdAt)).limit(100) : [];
  const crawls = rows.filter((scan) => scan.scanType === "browser"); const siteName = new Map(sites.map((site) => [site.id, site.name]));
  return <div className="page-wrap space-y-6"><PageHeader eyebrow={<SectionEyebrow href="/dashboard/discovery">Discovery & Monitoring</SectionEyebrow>} title="Browser crawler" description="Crawl safe internal pages in a real browser and retain observed evidence for review." />
    {sites.length > 0 && <BrowserCrawlForm websites={sites} />}
    <Card><div className="card-section-header"><h2 className="text-base font-semibold">Crawl history</h2><span className="text-sm text-[var(--muted-foreground)]">{crawls.length} crawls</span></div><div className="table-scroll"><table className="min-w-full text-sm"><thead><tr className="border-b bg-[var(--muted)]/60">{["Website", "Status", "Progress", "Pages", "Evidence", "Started", ""].map((label) => <th className="px-4 py-3 text-left" key={label}>{label}</th>)}</tr></thead><tbody>{crawls.map((scan) => <tr className="border-b" key={scan.id}><td className="px-4 py-3">{siteName.get(scan.websiteId)}</td><td className="px-4 py-3"><Badge variant={scan.status === "completed" ? "success" : scan.status === "failed" ? "danger" : "neutral"} size="sm">{scan.status}</Badge></td><td className="px-4 py-3">{scan.progress}%</td><td className="px-4 py-3">{scan.pagesScanned}/{scan.pagesDiscovered}</td><td className="px-4 py-3">{scan.itemsDetected}</td><td className="px-4 py-3">{scan.startedAt?.toLocaleString() ?? "Queued"}</td><td className="px-4 py-3"><Link className="btn btn-outline btn-sm" href={`/dashboard/browser-crawler/${scan.id}`}>Inspect</Link></td></tr>)}{crawls.length === 0 && <tr><td className="px-4 py-8 text-center text-[var(--muted-foreground)]" colSpan={7}>No browser crawls yet.</td></tr>}</tbody></table></div></Card></div>;
}
