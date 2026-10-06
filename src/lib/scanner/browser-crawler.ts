import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { crawlPages } from "@/db/schema/crawl-pages";
import { runtimeDiscoveryObservations } from "@/db/schema/runtime-discovery-observations";
import { scans } from "@/db/schema/scans";
import { websites } from "@/db/schema/websites";
import { trackers } from "@/db/schema/trackers";
import { fetchPublicText, startSafeBrowserProxy, validateSafeBrowserTarget } from "./safe-browser-proxy";
import { redactDiscoveryKey, redactDiscoveryPath, sanitizeDiscoveryPageUrl } from "@/lib/discovery-redaction-core";
import { logger } from "@/lib/logger";
import { BROWSER_CRAWL_CHROMIUM_ARGS, browserCrawlConfigSchema, completedCrawlStatus, crawlerEgressGuardEnabled, crawlerSafeRequestHeaders, isSameCrawlSite, normalizeCrawlUrl, robotsAllows, type BrowserCrawlConfig } from "./browser-crawl-core";
export { BROWSER_CRAWL_CHROMIUM_ARGS, browserCrawlConfigSchema, crawlerEgressGuardEnabled, crawlerSafeRequestHeaders, isSameCrawlSite, normalizeCrawlUrl, robotsAllows, type BrowserCrawlConfig } from "./browser-crawl-core";

export const BROWSER_CRAWLER_VERSION = "2.0.0";
const MAX_RESOURCES_PER_PAGE = 250;


async function loadRobots(root: string): Promise<string> {
  try {
    const robotsUrl = new URL("/robots.txt", root).href;
    return await fetchPublicText(robotsUrl, { maxBytes: 128_000, timeoutMs: 5_000 }) ?? "";
  } catch { return ""; }
}

type CapturedResource = { url: string; type: string; method: string; initiator: string | null };
function cleanResource(url: string) {
  try { const parsed = new URL(url); return { host: parsed.hostname.toLowerCase(), path: redactDiscoveryPath(parsed.pathname) || "/" }; } catch { return null; }
}

function safeObservedPageUrl(url: string): string | null {
  try { return sanitizeDiscoveryPageUrl(url); } catch { return null; }
}

export async function queueBrowserCrawl(websiteId: string, config: BrowserCrawlConfig) {
  const [scan] = await db.insert(scans).values({ websiteId, status: "queued", scanType: "browser", triggeredBy: "manual", scannerVersion: BROWSER_CRAWLER_VERSION, crawlConfig: config }).returning();
  return scan;
}

export async function cancelBrowserCrawl(scanId: string) {
  await db.update(scans).set({ cancelRequestedAt: new Date(), updatedAt: new Date() }).where(and(eq(scans.id, scanId), eq(scans.scanType, "browser"), inArray(scans.status, ["queued", "running"])));
  await db.update(scans).set({ status: "cancelled", completedAt: new Date(), updatedAt: new Date(), progress: 100 }).where(and(eq(scans.id, scanId), eq(scans.scanType, "browser"), eq(scans.status, "queued")));
}

async function cancellationRequested(scanId: string) {
  const [scan] = await db.select({ cancelRequestedAt: scans.cancelRequestedAt }).from(scans).where(eq(scans.id, scanId)).limit(1);
  return Boolean(scan?.cancelRequestedAt);
}

/** Claims one queued crawl. This is deliberately callable from cron/worker infrastructure, never the dashboard. */
export async function processNextBrowserCrawl(): Promise<string | null> {
  if (!crawlerEgressGuardEnabled(process.env.CONSENT_GURU_CRAWLER_EGRESS_RESTRICTED)) {
    logger.warn("Browser crawl worker is disabled until outbound egress restrictions are attested", { operation: "scanner.browser.egress_guard" });
    return null;
  }
  const [next] = await db.select().from(scans).where(and(eq(scans.status, "queued"), eq(scans.scanType, "browser"))).orderBy(asc(scans.createdAt)).limit(1);
  if (!next) return null;
  const [claimed] = await db.update(scans).set({ status: "running", startedAt: new Date(), progress: 1, updatedAt: new Date() }).where(and(eq(scans.id, next.id), eq(scans.status, "queued"))).returning();
  if (!claimed) return null;
  try {
    await runBrowserCrawl(claimed.id);
  } catch (error) {
    logger.error("Browser crawl could not start", { operation: "scanner.browser.start", scanId: claimed.id, error });
    await db.update(scans).set({ status: "failed", errorMessage: "Browser crawl could not start", completedAt: new Date(), progress: 100, updatedAt: new Date() }).where(and(eq(scans.id, claimed.id), eq(scans.status, "running")));
  }
  return claimed.id;
}

export async function runBrowserCrawl(scanId: string): Promise<void> {
  const [scan] = await db.select().from(scans).where(eq(scans.id, scanId)).limit(1);
  if (!scan || scan.scanType !== "browser") return;
  const [site] = await db.select({ id: websites.id, organizationId: websites.organizationId, domain: websites.domain }).from(websites).where(eq(websites.id, scan.websiteId)).limit(1);
  if (!site) throw new Error("Website no longer exists");
  const config = browserCrawlConfigSchema.parse(scan.crawlConfig);
  const root = normalizeCrawlUrl((await validateSafeBrowserTarget(site.domain)).href);
  if (!root) throw new Error("Invalid crawl URL");
  const robots = config.respectRobots ? await loadRobots(root) : "";
  const playwright = await import("playwright");
  const proxy = await startSafeBrowserProxy();
  let browser: import("playwright").Browser | undefined;
  const seen = new Set<string>(); const queue: Array<{ url: string; depth: number }> = [{ url: root, depth: 0 }];
  const scheduled = new Set<string>([root]);
  let pages = 0, loadedPages = 0, discovered = 1, resources = 0, items = 0, claimedPages = 0, cancelled = false;
  try {
    browser = await playwright.chromium.launch({ headless: true, args: [...BROWSER_CRAWL_CHROMIUM_ARGS] });
    const activeBrowser = browser;
    const crawlPage = async (job: { url: string; depth: number }, normalized: string) => {
      const context = await activeBrowser.newContext({ userAgent: "ConsentGuruBrowserCrawler/2.0 (+privacy scanning)", serviceWorkers: "block", proxy: { server: proxy.url } });
      const page = await context.newPage(); const captured: CapturedResource[] = [];
      await page.route("**/*", async (route) => {
        const request = route.request();
        if (captured.length >= MAX_RESOURCES_PER_PAGE) return route.abort();
        if (request.isNavigationRequest() && request.frame() === page.mainFrame() && !isSameCrawlSite(request.url(), root)) return route.abort();
        try { await validateSafeBrowserTarget(request.url()); } catch { return route.abort(); }
        captured.push({ url: request.url(), type: request.resourceType(), method: request.method(), initiator: request.frame().url() || null });
        return route.continue({ headers: crawlerSafeRequestHeaders(await request.allHeaders()) });
      });
      let statusCode: number | null = null; let error: string | null = null;
      try { const response = await page.goto(normalized, { waitUntil: "domcontentloaded", timeout: 20_000 }); statusCode = response?.status() ?? null; if (statusCode !== null && statusCode >= 400) error = "Page returned an HTTP error"; await page.waitForTimeout(500); }
      catch { error = "Page could not be loaded"; }
      const finalUrl = safeObservedPageUrl(normalizeCrawlUrl(page.url()) ?? normalized) ?? safeObservedPageUrl(normalized) ?? root;
      const title = error ? null : (await page.title().catch(() => "")).slice(0, 512);
      const links = error ? [] : await page.locator("a[href]").evaluateAll((anchors) => anchors.slice(0, 500).map((a) => (a as HTMLAnchorElement).href)).catch(() => [] as string[]);
      const cookies = await context.cookies().catch(() => []);
      const storage = error ? { local: [] as string[], session: [] as string[] } : await page.evaluate(() => ({
        local: Array.from({ length: Math.min(localStorage.length, 100) }, (_, index) => localStorage.key(index)).filter((key): key is string => Boolean(key)),
        session: Array.from({ length: Math.min(sessionStorage.length, 100) }, (_, index) => sessionStorage.key(index)).filter((key): key is string => Boolean(key)),
      })).catch(() => ({ local: [] as string[], session: [] as string[] }));
      const now = new Date();
      const knownTrackers = await db.select().from(trackers).where(eq(trackers.websiteId, site.id));
      const mappedTracker = (host: string | null) => host ? knownTrackers.find((tracker) => {
        const domain = tracker.domain?.toLowerCase().replace(/^www\./, ""); const value = host.toLowerCase().replace(/^www\./, "");
        return Boolean(domain && (value === domain || value.endsWith(`.${domain}`)));
      }) : undefined;
      const observations = captured.map((resource) => {
        const parsed = cleanResource(resource.url); if (!parsed) return null;
        const tracker = mappedTracker(parsed.host); return { organizationId: site.organizationId, websiteId: site.id, trackerId: tracker?.id ?? null, vendorId: tracker?.vendorId ?? null, purposeId: tracker?.purposeId ?? null, eventId: randomUUID(), observationType: "resource", evidenceStatus: "observed", discoverySource: "browser_crawler", pageUrl: finalUrl, pageOrigin: new URL(finalUrl).origin, destinationHost: parsed.host, resourcePath: parsed.path, resourceType: resource.type.slice(0, 32), requestMethod: resource.method.slice(0, 12), initiator: resource.initiator ? safeObservedPageUrl(resource.initiator) : null, party: isSameCrawlSite(resource.url, root) ? "first_party" : "third_party", navigationType: null, storageKey: null, consentState: {}, sanitizationStatus: "sanitized", confidence: 100, metadata: { scanId }, observedAt: now };
      }).filter(Boolean) as typeof runtimeDiscoveryObservations.$inferInsert[];
      for (const cookie of cookies.slice(0, 100)) { const host = cookie.domain.replace(/^\./, ""); const tracker = mappedTracker(host); observations.push({ organizationId: site.organizationId, websiteId: site.id, trackerId: tracker?.id ?? null, vendorId: tracker?.vendorId ?? null, purposeId: tracker?.purposeId ?? null, eventId: randomUUID(), observationType: "cookie", evidenceStatus: "observed", discoverySource: "browser_crawler", pageUrl: finalUrl, pageOrigin: new URL(finalUrl).origin, destinationHost: host, resourcePath: null, resourceType: null, requestMethod: null, initiator: null, party: isSameCrawlSite(`https://${host}`, root) ? "first_party" : "third_party", navigationType: null, storageKey: redactDiscoveryKey(cookie.name), consentState: {}, sanitizationStatus: "sanitized", confidence: 100, metadata: { scanId, cookie: true }, observedAt: now }); }
      for (const [observationType, keys] of [["local_storage", storage.local], ["session_storage", storage.session]] as const) for (const key of keys) observations.push({ organizationId: site.organizationId, websiteId: site.id, eventId: randomUUID(), observationType, evidenceStatus: "observed", discoverySource: "browser_crawler", pageUrl: finalUrl, pageOrigin: new URL(finalUrl).origin, destinationHost: new URL(finalUrl).hostname, resourcePath: null, resourceType: null, requestMethod: null, initiator: null, party: "first_party", navigationType: null, storageKey: redactDiscoveryKey(key), consentState: {}, sanitizationStatus: "sanitized", confidence: 100, metadata: { scanId }, observedAt: now });
      if (observations.length) await db.insert(runtimeDiscoveryObservations).values(observations).onConflictDoNothing();
      await db.insert(crawlPages).values({ scanId, websiteId: site.id, url: finalUrl, normalizedUrl: finalUrl, depth: job.depth, statusCode, title, errorMessage: error, resourcesObserved: captured.length, cookiesObserved: cookies.length, metadata: { evidenceStatus: "observed", discoverySource: "browser_crawler" } });
      pages++; if (!error && statusCode !== null && statusCode < 400) loadedPages++; resources += captured.length; items += observations.length;
      if (job.depth < config.maxDepth) for (const link of links) { const url = normalizeCrawlUrl(link); if (url && isSameCrawlSite(url, root) && !scheduled.has(url) && queue.length < config.maxPages * 3) { scheduled.add(url); queue.push({ url, depth: job.depth + 1 }); discovered++; } }
      await context.close();
      const progress = Math.min(99, Math.round((pages / config.maxPages) * 100));
      await db.update(scans).set({
        pagesScanned: sql`pages_scanned + 1`,
        pagesDiscovered: sql`GREATEST(pages_discovered, ${Math.min(discovered, config.maxPages)})`,
        resourcesObserved: sql`resources_observed + ${captured.length}`,
        itemsDetected: sql`items_detected + ${observations.length}`,
        progress: sql`GREATEST(progress, ${progress})`, updatedAt: new Date(),
      }).where(eq(scans.id, scanId));
    };
    const worker = async () => {
      while (!cancelled) {
        if (await cancellationRequested(scanId)) { cancelled = true; return; }
        if (claimedPages >= config.maxPages) return;
        const job = queue.shift();
        if (!job) return;
        const normalized = normalizeCrawlUrl(job.url);
        if (!normalized || seen.has(normalized) || !isSameCrawlSite(normalized, root)) continue;
        if (robots && !robotsAllows(robots, new URL(normalized).pathname)) continue;
        await validateSafeBrowserTarget(normalized);
        // DNS validation yields; another worker can claim the same URL or the
        // last page slot while it is in progress.
        if (seen.has(normalized) || claimedPages >= config.maxPages) continue;
        seen.add(normalized);
        claimedPages++;
        await crawlPage(job, normalized);
      }
    };
    const workers = await Promise.allSettled(Array.from({ length: config.concurrency }, () => worker()));
    const workerFailure = workers.find((result): result is PromiseRejectedResult => result.status === "rejected");
    if (workerFailure) throw workerFailure.reason;
    cancelled = cancelled || await cancellationRequested(scanId);
    const status = completedCrawlStatus(cancelled, loadedPages);
    await db.update(scans).set({ status, errorMessage: status === "failed" ? "No pages could be loaded successfully; check the website and robots policy" : null, completedAt: new Date(), progress: 100, pagesScanned: pages, pagesDiscovered: Math.min(discovered, config.maxPages), resourcesObserved: resources, itemsDetected: items, updatedAt: new Date() }).where(eq(scans.id, scanId));
  } catch (error) {
    logger.error("Browser crawl failed", { operation: "scanner.browser", scanId, error });
    await db.update(scans).set({ status: "failed", errorMessage: "Browser crawl failed", completedAt: new Date(), progress: 100, updatedAt: new Date() }).where(eq(scans.id, scanId));
  } finally {
    try { await browser?.close(); } finally { await proxy.close(); }
  }
}
