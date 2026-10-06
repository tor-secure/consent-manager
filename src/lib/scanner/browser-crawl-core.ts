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
  "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1",
  "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
] as const;

export function completedCrawlStatus(cancelled: boolean, loadedPages: number): "cancelled" | "completed" | "failed" {
  return cancelled ? "cancelled" : loadedPages > 0 ? "completed" : "failed";
}

/** Deployment must explicitly attest that the worker has outbound SSRF egress controls. */
export function crawlerEgressGuardEnabled(value: string | undefined): boolean {
  return value === "true";
}

const SENSITIVE_REQUEST_HEADERS = new Set([
  "authorization", "proxy-authorization", "proxy-connection", "cookie", "set-cookie", "api-key", "x-api-key",
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

// Greedy wildcard matching avoids regex backtracking on untrusted robots rules.
function robotsPathMatches(pattern: string, pathname: string, anchored: boolean): boolean {
  let position = 0, cursor = 0, star = -1, retry = 0;
  while (cursor < pathname.length) {
    if (position === pattern.length && !anchored) return true;
    if (pattern[position] === "*") { star = position++; retry = cursor; }
    else if (pattern[position] === pathname[cursor]) { position++; cursor++; }
    else if (star >= 0) { position = star + 1; cursor = ++retry; }
    else return false;
  }
  while (pattern[position] === "*") position++;
  return position === pattern.length;
}

export function robotsAllows(robots: string, pathname: string): boolean {
  const groups: Array<{ agents: string[]; rules: Array<{ path: string; allow: boolean }>; startedRules: boolean }> = [];
  let group: (typeof groups)[number] | undefined;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.split("#", 1)[0];
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === "user-agent") {
      if (!group || group.startedRules) { group = { agents: [], rules: [], startedRules: false }; groups.push(group); }
      group.agents.push(value.toLowerCase());
    } else if (group && (key === "allow" || key === "disallow")) {
      group.startedRules = true;
      if (value) group.rules.push({ path: value, allow: key === "allow" });
    }
  }
  const agent = "consentgurubrowsercrawler";
  const specificity = (agents: string[]) => Math.max(-1, ...agents.map((value) => value === "*" ? 0 : value && agent.includes(value) ? value.length : -1));
  const best = Math.max(-1, ...groups.map((entry) => specificity(entry.agents)));
  let longest = -1, allowed = true;
  for (const entry of groups) {
    if (best < 0 || specificity(entry.agents) !== best) continue;
    for (const rule of entry.rules) {
      const anchored = rule.path.endsWith("$");
      const path = anchored ? rule.path.slice(0, -1) : rule.path;
      const length = path.replace(/\*/g, "").length;
      if (robotsPathMatches(path, pathname, anchored) && (length > longest || (length === longest && rule.allow))) {
        longest = length; allowed = rule.allow;
      }
    }
  }
  return allowed;
}
