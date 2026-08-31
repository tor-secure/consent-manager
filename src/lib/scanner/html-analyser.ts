import "server-only";
import { matchDomain, type TrackerSignature } from "./tracker-signatures";
import {
  getSafeScanUrl,
  ScannerUrlError,
} from "./ssrf-guard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DetectedItem = {
  type: string;
  name: string;
  domain: string | null;
  identifier: string | null;          // script src / img src / cookie name / etc.
  riskLevel: string;
  classificationStatus: "known" | "unclassified";
  category: string;
  signature: (TrackerSignature & { matchedDomain: string }) | null;
  details: Record<string, unknown>;
};

export type AnalysisResult = {
  url: string;
  fetchedAt: Date;
  items: DetectedItem[];
  fetchError: string | null;
  rawTitle: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SCANNER_UA =
  "Mozilla/5.0 (compatible; CMPScanner/1.0; +https://cmp.example.com/scanner)";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function extractHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

// Extremely lightweight HTML attribute parser — avoids bringing in an HTML
// parser library. Extracts values of a specific attribute from matching tags.
function extractAttributeValues(
  html: string,
  tagPattern: RegExp,
  attribute: string,
): string[] {
  const results: string[] = [];
  const attrRe = new RegExp(`${attribute}\\s*=\\s*["']([^"']+)["']`, "gi");
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = tagPattern.exec(html)) !== null) {
    const tagText = tagMatch[0];
    const attrMatch = attrRe.exec(tagText);
    if (attrMatch) results.push(attrMatch[1]);
    attrRe.lastIndex = 0; // reset for next tag
  }

  return results;
}

async function readLimitedText(response: Response): Promise<string | null> {
  const declared = response.headers.get("content-length");
  if (declared) {
    const n = Number(declared);
    if (Number.isFinite(n) && n > MAX_HTML_BYTES) return null;
  }

  if (!response.body) {
    const html = await response.text();
    return html.length > MAX_HTML_BYTES ? null : html;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_HTML_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
}

async function discardBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// fetchHtml — timeout, size cap, and SSRF-safe redirect handling.
// Validates the target (and every redirect hop) before connecting.
// ---------------------------------------------------------------------------

async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let current = await getSafeScanUrl(url);

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const response = await fetch(current, {
        signal: controller.signal,
        headers: {
          "User-Agent": SCANNER_UA,
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "manual",
      });

      if (REDIRECT_STATUSES.has(response.status)) {
        const location = response.headers.get("location");
        await discardBody(response);
        if (!location) return null;
        let next: URL;
        try {
          next = new URL(location, current);
        } catch {
          return null;
        }
        current = await getSafeScanUrl(next.href);
        continue;
      }

      if (!response.ok) {
        await discardBody(response);
        return null;
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (
        !contentType.includes("text/html") &&
        !contentType.includes("application/xhtml")
      ) {
        await discardBody(response);
        return null;
      }

      const html = await readLimitedText(response);
      if (html === null) return null;
      return { html, finalUrl: current };
    }

    return null;
  } catch (error) {
    if (error instanceof ScannerUrlError) throw error;
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// analyseHtml — extract tracking-relevant items from raw HTML.
// ---------------------------------------------------------------------------

function analyseHtml(html: string, pageUrl: string): DetectedItem[] {
  const items: DetectedItem[] = [];
  const seen = new Set<string>(); // dedup by "type:identifier"

  function add(item: DetectedItem) {
    const key = `${item.type}:${item.identifier ?? item.domain ?? item.name}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  }

  const pageHostname = extractHostname(pageUrl) ?? "";

  // ── 1. External <script src="..."> ───────────────────────────────────────
  const scriptTagRe = /<script[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;

  while ((m = scriptTagRe.exec(html)) !== null) {
    const src = m[1];
    const hostname = extractHostname(src);
    if (!hostname || hostname === pageHostname) continue; // skip same-origin

    const sig = matchDomain(hostname);
    add({
      type: sig?.type ?? "script",
      name: sig?.name ?? hostname,
      domain: sig?.matchedDomain ?? hostname,
      identifier: src.length > 500 ? src.slice(0, 500) : src,
      riskLevel: sig?.riskLevel ?? "unknown",
      classificationStatus: sig ? "known" : "unclassified",
      category: sig?.category ?? "unknown",
      signature: sig ?? null,
      details: { src },
    });
  }

  // ── 2. <img src="..."> pixel detection ───────────────────────────────────
  // 1×1 or tracking pixels typically have width="1" height="1" or are from
  // known tracking domains.
  const imgTagRe = /<img[^>]+>/gi;
  while ((m = imgTagRe.exec(html)) !== null) {
    const tag = m[0];
    const srcMatch = /src\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (!srcMatch) continue;
    const src = srcMatch[1];
    const hostname = extractHostname(src);
    if (!hostname || hostname === pageHostname) continue;

    // Only flag if it's a known tracker domain OR looks like a pixel
    // (width/height 1, or path contains track/pixel/event).
    const sig = matchDomain(hostname);
    const isPixelPath = /track|pixel|event|imp|beacon/i.test(src);
    const isPixelSize =
      /width\s*=\s*["']1["']/i.test(tag) &&
      /height\s*=\s*["']1["']/i.test(tag);

    if (!sig && !isPixelPath && !isPixelSize) continue;

    add({
      type: "pixel",
      name: sig?.name ?? hostname,
      domain: sig?.matchedDomain ?? hostname,
      identifier: src.length > 500 ? src.slice(0, 500) : src,
      riskLevel: sig?.riskLevel ?? "medium",
      classificationStatus: sig ? "known" : "unclassified",
      category: sig?.category ?? "advertising",
      signature: sig ?? null,
      details: { src, isPixelSize, isPixelPath },
    });
  }

  // ── 3. <link rel="preload|prefetch|dns-prefetch"> third-party ────────────
  const linkTagRe = /<link[^>]+>/gi;
  while ((m = linkTagRe.exec(html)) !== null) {
    const tag = m[0];
    const rel = /rel\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase() ?? "";
    if (!["preload", "prefetch", "dns-prefetch"].includes(rel)) continue;
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (!href) continue;
    const hostname = extractHostname(href.startsWith("//") ? `https:${href}` : href);
    if (!hostname || hostname === pageHostname) continue;

    const sig = matchDomain(hostname);
    if (!sig) continue; // only flag known trackers in link tags

    add({
      type: sig.type,
      name: sig.name,
      domain: sig.matchedDomain,
      identifier: null,
      riskLevel: sig.riskLevel,
      classificationStatus: "known",
      category: sig.category,
      signature: sig,
      details: { rel, href },
    });
  }

  // ── 4. Inline cookie-setting patterns ───────────────────────────────────
  // Look for document.cookie = "..." in inline scripts.
  const cookieSetRe = /document\.cookie\s*=\s*["']([^"']{1,300})["']/g;
  while ((m = cookieSetRe.exec(html)) !== null) {
    const cookieStr = m[1];
    // Extract name (first part before =)
    const cookieName = cookieStr.split("=")[0].trim().replace(/^_+/, "");
    if (!cookieName) continue;

    add({
      type: "cookie",
      name: `Cookie: ${cookieName}`,
      domain: pageHostname,
      identifier: cookieName,
      riskLevel: "medium",
      classificationStatus: "unclassified",
      category: "unknown",
      signature: null,
      details: { rawValue: cookieStr.slice(0, 200) },
    });
  }

  // ── 5. iframe src third-party ────────────────────────────────────────────
  const iframeRe = /<iframe[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
  while ((m = iframeRe.exec(html)) !== null) {
    const src = m[1];
    const hostname = extractHostname(src);
    if (!hostname || hostname === pageHostname) continue;
    const sig = matchDomain(hostname);
    if (!sig) continue; // only flag known

    add({
      type: sig.type,
      name: sig.name,
      domain: sig.matchedDomain,
      identifier: src.length > 500 ? src.slice(0, 500) : src,
      riskLevel: sig.riskLevel,
      classificationStatus: "known",
      category: sig.category,
      signature: sig,
      details: { iframe: true, src },
    });
  }

  // ── 6. Beacon / sendBeacon / fetch to third-party in inline JS ───────────
  const beaconRe = /navigator\.sendBeacon\s*\(\s*["'](https?:\/\/[^"']+)["']/g;
  while ((m = beaconRe.exec(html)) !== null) {
    const beaconUrl = m[1];
    const hostname = extractHostname(beaconUrl);
    if (!hostname || hostname === pageHostname) continue;
    const sig = matchDomain(hostname);

    add({
      type: "beacon",
      name: sig?.name ?? hostname,
      domain: sig?.matchedDomain ?? hostname,
      identifier: beaconUrl.length > 500 ? beaconUrl.slice(0, 500) : beaconUrl,
      riskLevel: sig?.riskLevel ?? "medium",
      classificationStatus: sig ? "known" : "unclassified",
      category: sig?.category ?? "analytics",
      signature: sig ?? null,
      details: { beaconUrl },
    });
  }

  return items;
}

// Extract <title> text for scan metadata.
function extractTitle(html: string): string | null {
  const match = /<title[^>]*>([^<]{1,200})<\/title>/i.exec(html);
  return match ? match[1].trim() : null;
}

// ---------------------------------------------------------------------------
// analyseUrl — public entry point.
// ---------------------------------------------------------------------------

export async function analyseUrl(url: string): Promise<AnalysisResult> {
  let fetched: { html: string; finalUrl: string } | null;

  try {
    fetched = await fetchHtml(url);
  } catch (error) {
    const message =
      error instanceof ScannerUrlError
        ? error.message
        : "Failed to fetch URL (network error, timeout, or non-HTML response)";
    return {
      url,
      fetchedAt: new Date(),
      items: [],
      fetchError: message,
      rawTitle: null,
    };
  }

  if (!fetched) {
    return {
      url,
      fetchedAt: new Date(),
      items: [],
      fetchError: "Failed to fetch URL (network error, timeout, or non-HTML response)",
      rawTitle: null,
    };
  }

  const items = analyseHtml(fetched.html, fetched.finalUrl);
  const rawTitle = extractTitle(fetched.html);

  return {
    url: fetched.finalUrl,
    fetchedAt: new Date(),
    items,
    fetchError: null,
    rawTitle,
  };
}
