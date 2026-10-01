import { z } from "zod";

export const browserCrawlConfigSchema = z.object({
  maxDepth: z.coerce.number().int().min(0).max(5).default(2),
  maxPages: z.coerce.number().int().min(1).max(100).default(25),
  concurrency: z.coerce.number().int().min(1).max(3).default(1),
  respectRobots: z.boolean().default(true),
}).strict();
export type BrowserCrawlConfig = z.infer<typeof browserCrawlConfigSchema>;

/** Chromium must not resolve target hosts itself or open direct WebRTC UDP sockets. */
export const BROWSER_CRAWL_CHROMIUM_ARGS = [
  "--host-resolver-rules=MAP * ~NOTFOUND",
  "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
] as const;

/** Deployment must explicitly attest that the worker has outbound SSRF egress controls. */
export function crawlerEgressGuardEnabled(value: string | undefined): boolean {
  return value === "true";
}

const SENSITIVE_REQUEST_HEADERS = new Set([
  "authorization", "proxy-authorization", "cookie", "set-cookie", "api-key", "x-api-key",
  "x-auth-token", "x-access-token", "x-session-token", "x-csrf-token", "x-xsrf-token",
]);
export function crawlerSafeRequestHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(headers).filter(([name]) => {
    const normalized = name.toLowerCase();
    return !SENSITIVE_REQUEST_HEADERS.has(normalized) && !/(?:^|[-_])(token|secret|credential|password)(?:$|[-_])/.test(normalized);
  }));
}

export function crawlerSafeProxyHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string | string[]> {
  const safe: Record<string, string | string[]> = {};
  for (const [name, value] of Object.entries(headers)) {
    const normalized = name.toLowerCase();
    if (value !== undefined && !SENSITIVE_REQUEST_HEADERS.has(normalized) && !/(?:^|[-_])(token|secret|credential|password)(?:$|[-_])/.test(normalized)) safe[name] = value;
  }
  return safe;
}

export function normalizeCrawlUrl(value: string): string | null {
  try { const url = new URL(value); if (url.protocol !== "http:" && url.protocol !== "https:") return null; url.username = ""; url.password = ""; url.hash = ""; url.search = ""; url.hostname = url.hostname.toLowerCase().replace(/^www\./, ""); if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) url.port = ""; if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, ""); return url.href; } catch { return null; }
}
export function isSameCrawlSite(candidate: string, root: string): boolean { try { const a = new URL(candidate); const b = new URL(root); return a.hostname.toLowerCase().replace(/^www\./, "") === b.hostname.toLowerCase().replace(/^www\./, "") && a.protocol === b.protocol; } catch { return false; } }
export function robotsAllows(robots: string, pathname: string): boolean { let applies = false; for (const raw of robots.split(/\r?\n/)) { const [key, ...rest] = raw.split(":"); const value = rest.join(":").trim(); if (!key) continue; if (key.trim().toLowerCase() === "user-agent") applies = value === "*"; if (applies && key.trim().toLowerCase() === "disallow" && value && pathname.startsWith(value)) return false; } return true; }
