import "server-only";

import { createHash } from "node:crypto";
import { promises as dns } from "node:dns";

import {
  SITE_VERIFICATION_TXT_PREFIX,
  SITE_VERIFICATION_WELL_KNOWN_PATH,
  htmlHasVerificationMeta,
  verificationFetchHosts,
} from "@/lib/website-domain-verify-constants";
import { fetchVerificationDocument } from "@/lib/website-domain-verify-fetch";

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

export async function checkMetaTag(domain: string, token: string): Promise<boolean> {
  for (const host of verificationFetchHosts(domain)) {
    for (const protocol of ["https", "http"] as const) {
      const html = await fetchVerificationDocument(`${protocol}://${host}/`);
      if (html && htmlHasVerificationMeta(html, token)) return true;
    }
  }
  return false;
}

export async function checkWellKnownFile(domain: string, token: string): Promise<boolean> {
  for (const host of verificationFetchHosts(domain)) {
    for (const protocol of ["https", "http"] as const) {
      const body = await fetchVerificationDocument(
        `${protocol}://${host}${SITE_VERIFICATION_WELL_KNOWN_PATH}`,
      );
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
