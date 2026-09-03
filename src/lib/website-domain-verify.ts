import "server-only";

import { createHash } from "node:crypto";
import { promises as dns } from "node:dns";
import net from "node:net";

import {
  SITE_VERIFICATION_META_NAME,
  SITE_VERIFICATION_TXT_PREFIX,
  SITE_VERIFICATION_WELL_KNOWN_PATH,
} from "@/lib/website-domain-verify-constants";

export {
  SITE_VERIFICATION_META_NAME,
  SITE_VERIFICATION_TXT_PREFIX,
  SITE_VERIFICATION_WELL_KNOWN_PATH,
} from "@/lib/website-domain-verify-constants";

export function siteVerificationToken(websiteId: string, siteKey: string): string {
  return createHash("sha256")
    .update(`cmp-site:${websiteId}:${siteKey}`)
    .digest("hex")
    .slice(0, 32);
}

function isBlockedIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }
  if (version === 6) {
    const normalized = ip.toLowerCase();
    if (normalized === "::1" || normalized === "::") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    if (normalized.startsWith("fe80")) return true;
    if (normalized.startsWith("::ffff:")) {
      return isBlockedIp(normalized.slice("::ffff:".length));
    }
    return false;
  }
  return true;
}

async function domainResolvesPublicly(domain: string): Promise<boolean> {
  try {
    const v4 = await dns.resolve4(domain).catch(() => [] as string[]);
    const v6 = await dns.resolve6(domain).catch(() => [] as string[]);
    const ips = [...v4, ...v6];
    if (ips.length === 0) return false;
    return ips.every((ip) => !isBlockedIp(ip));
  } catch {
    return false;
  }
}

function tokenMatches(haystack: string, token: string): boolean {
  return haystack.replace(/\s+/g, " ").includes(token);
}

export async function checkDnsTxt(domain: string, token: string): Promise<boolean> {
  try {
    const records = await dns.resolveTxt(domain);
    return records.some((chunks) => {
      const value = chunks.join("");
      return (
        value === token ||
        value === `${SITE_VERIFICATION_TXT_PREFIX}${token}` ||
        tokenMatches(value, `${SITE_VERIFICATION_TXT_PREFIX}${token}`)
      );
    });
  } catch {
    return false;
  }
}

async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        Accept: "text/html,text/plain,*/*",
        "User-Agent": "ConsentManager-DomainVerify/1.0",
      },
    });
    if (response.status >= 300 && response.status < 400) return null;
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

export async function checkMetaTag(domain: string, token: string): Promise<boolean> {
  if (!(await domainResolvesPublicly(domain))) return false;
  for (const protocol of ["https", "http"] as const) {
    const html = await fetchText(`${protocol}://${domain}/`);
    if (!html) continue;
    const pattern = new RegExp(
      `<meta[^>]+name=["']${SITE_VERIFICATION_META_NAME}["'][^>]+content=["']${token}["']`,
      "i",
    );
    const patternAlt = new RegExp(
      `<meta[^>]+content=["']${token}["'][^>]+name=["']${SITE_VERIFICATION_META_NAME}["']`,
      "i",
    );
    if (pattern.test(html) || patternAlt.test(html)) return true;
  }
  return false;
}

export async function checkWellKnownFile(domain: string, token: string): Promise<boolean> {
  if (!(await domainResolvesPublicly(domain))) return false;
  for (const protocol of ["https", "http"] as const) {
    const body = await fetchText(`${protocol}://${domain}${SITE_VERIFICATION_WELL_KNOWN_PATH}`);
    if (body && body.trim() === token) return true;
  }
  return false;
}

export type DomainVerifyResult = {
  verified: boolean;
  method: "dns" | "meta" | "file" | null;
  checks: {
    dns: boolean;
    meta: boolean;
    file: boolean;
  };
};

export async function verifyWebsiteDomain(
  domain: string,
  token: string,
): Promise<DomainVerifyResult> {
  const [dnsOk, metaOk, fileOk] = await Promise.all([
    checkDnsTxt(domain, token),
    checkMetaTag(domain, token),
    checkWellKnownFile(domain, token),
  ]);

  const method = dnsOk ? "dns" : metaOk ? "meta" : fileOk ? "file" : null;
  return {
    verified: Boolean(method),
    method,
    checks: { dns: dnsOk, meta: metaOk, file: fileOk },
  };
}
