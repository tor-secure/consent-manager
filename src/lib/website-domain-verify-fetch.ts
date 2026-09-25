import { assertSafeScanUrl } from "@/lib/scanner/ssrf-guard";
import { apexHostname } from "@/lib/website-domain-verify-constants";

const MAX_REDIRECTS = 8;

type StoredCookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
};

function isClerkHandshake(url: URL, originApex: string): boolean {
  const host = url.hostname.toLowerCase();
  const clerkHost = host.endsWith(".clerk.accounts.dev") || host.endsWith(".clerk.accounts.com");
  if (!clerkHost || !url.pathname.startsWith("/v1/client/handshake")) return false;
  const redirectUrl = url.searchParams.get("redirect_url");
  if (!redirectUrl) return true;
  try {
    return apexHostname(new URL(redirectUrl).hostname) === originApex;
  } catch {
    return false;
  }
}

function redirectAllowed(from: URL, next: URL, originApex: string): boolean {
  if (next.protocol !== "https:" && next.protocol !== "http:") return false;
  if (apexHostname(next.hostname) === apexHostname(from.hostname)) return true;
  if (apexHostname(next.hostname) === originApex) return true;
  return isClerkHandshake(next, originApex);
}

function parseSetCookie(header: string, requestHost: string): StoredCookie | null {
  const parts = header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  const pair = parts[0];
  if (!pair) return null;
  const eq = pair.indexOf("=");
  if (eq <= 0) return null;
  const name = pair.slice(0, eq).trim();
  let value = pair.slice(eq + 1).trim();
  let domain = requestHost.toLowerCase();
  let path = "/";
  let drop = false;
  for (const attr of parts.slice(1)) {
    const split = attr.indexOf("=");
    const key = (split === -1 ? attr : attr.slice(0, split)).trim().toLowerCase();
    const raw = split === -1 ? "" : attr.slice(split + 1).trim();
    if (key === "domain" && raw) domain = raw.replace(/^\./, "").toLowerCase();
    if (key === "path" && raw) path = raw;
    if (key === "max-age" && raw === "0") drop = true;
    if (key === "expires" && raw.includes("1970")) drop = true;
  }
  if (drop) value = "";
  return { name, value, domain, path };
}

function rememberCookies(jar: StoredCookie[], headers: Headers, requestHost: string) {
  const list = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  for (const header of list) {
    const cookie = parseSetCookie(header, requestHost);
    if (!cookie) continue;
    const index = jar.findIndex(
      (existing) =>
        existing.name === cookie.name &&
        existing.domain === cookie.domain &&
        existing.path === cookie.path,
    );
    if (!cookie.value) {
      if (index >= 0) jar.splice(index, 1);
      continue;
    }
    if (index >= 0) jar[index] = cookie;
    else jar.push(cookie);
  }
}

function cookieHeader(jar: StoredCookie[], url: URL): string {
  return jar
    .filter((cookie) => {
      const host = url.hostname.toLowerCase();
      const hostOk = host === cookie.domain || host.endsWith(`.${cookie.domain}`);
      const pathOk = url.pathname.startsWith(cookie.path || "/");
      return hostOk && pathOk;
    })
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

/**
 * Reads a public verification page. Follows same-site redirects and Clerk's
 * development handshake, keeping cookies so the homepage HTML is returned.
 * Other cross-site redirects are ignored.
 */
export async function fetchVerificationDocument(startUrl: string): Promise<string | null> {
  let current = startUrl;
  let originApex = "";
  const jar: StoredCookie[] = [];

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let parsed: URL;
    try {
      parsed = await assertSafeScanUrl(current);
    } catch {
      return null;
    }
    if (!originApex) originApex = apexHostname(parsed.hostname);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const headers: Record<string, string> = {
        Accept: "text/html,text/plain,*/*",
        "User-Agent": "ConsentManager-DomainVerify/1.0",
      };
      const cookie = cookieHeader(jar, parsed);
      if (cookie) headers.Cookie = cookie;

      const response = await fetch(parsed.href, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers,
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return null;
        const next = new URL(location, parsed);
        if (!redirectAllowed(parsed, next, originApex)) return null;
        rememberCookies(jar, response.headers, parsed.hostname);
        current = next.href;
        continue;
      }

      if (!response.ok) return null;
      const contentType = response.headers.get("content-type") ?? "";
      if (
        contentType &&
        !contentType.includes("text/") &&
        !contentType.includes("html") &&
        !contentType.includes("xml")
      ) {
        return null;
      }
      return (await response.text()).slice(0, 200_000);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}
