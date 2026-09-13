export const SITE_VERIFICATION_META_NAME = "cmp-site-verification";
export const SITE_VERIFICATION_TXT_PREFIX = "cmp-site-verification=";
export const SITE_VERIFICATION_WELL_KNOWN_PATH = "/.well-known/cmp-site-verification.txt";

export function apexHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
}

export function verificationFetchHosts(domain: string): string[] {
  const raw = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    ?.replace(/\.$/, "") ?? "";
  if (!raw) return [];
  const apex = apexHostname(raw);
  return [...new Set([raw, apex, `www.${apex}`])];
}

export function htmlHasVerificationMeta(html: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const collapsed = html.replace(/\s+/g, " ");
  const name = SITE_VERIFICATION_META_NAME;
  const namedThenContent = new RegExp(
    `<meta[^>]*name=["']${name}["'][^>]*content=["']${escaped}["']`,
    "i",
  );
  const contentThenNamed = new RegExp(
    `<meta[^>]*content=["']${escaped}["'][^>]*name=["']${name}["']`,
    "i",
  );
  return namedThenContent.test(collapsed) || contentThenNamed.test(collapsed);
}
