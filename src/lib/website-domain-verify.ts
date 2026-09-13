import "server-only";

import { createHash } from "node:crypto";
import { promises as dns } from "node:dns";

import {
  SITE_VERIFICATION_TXT_PREFIX,
  SITE_VERIFICATION_WELL_KNOWN_PATH,
  apexHostname,
  htmlHasVerificationMeta,
  verificationFetchHosts,
} from "@/lib/website-domain-verify-constants";
import { assertSafeScanUrl } from "@/lib/scanner/ssrf-guard";

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

async function fetchText(url: string, hops = 0): Promise<string | null> {
  if (hops > 3) return null;
  try {
    await assertSafeScanUrl(url);
  } catch {
    return null;
  }
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
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return null;
      const next = new URL(location, url);
      const from = new URL(url);
      if (next.protocol !== "https:" && next.protocol !== "http:") return null;
      if (apexHostname(from.hostname) !== apexHostname(next.hostname)) return null;
      return fetchText(next.href, hops + 1);
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

export async function checkMetaTag(domain: string, token: string): Promise<boolean> {
  for (const host of verificationFetchHosts(domain)) {
    for (const protocol of ["https", "http"] as const) {
      const html = await fetchText(`${protocol}://${host}/`);
      if (html && htmlHasVerificationMeta(html, token)) return true;
    }
  }
  return false;
}

export async function checkWellKnownFile(domain: string, token: string): Promise<boolean> {
  for (const host of verificationFetchHosts(domain)) {
    for (const protocol of ["https", "http"] as const) {
      const body = await fetchText(`${protocol}://${host}${SITE_VERIFICATION_WELL_KNOWN_PATH}`);
      if (body && body.trim() === token) return true;
    }
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
