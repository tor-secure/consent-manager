/**
 * Absolute origin of this CMP app, used in embed snippets so customer sites
 * load `/api/sdk/script` from Consent Guru instead of their own hostname.
 */

export function resolvePublicAppOrigin(input: {
  host?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  envOrigin?: string | null;
}): string {
  const explicit = String(input.envOrigin ?? "").trim().replace(/\/$/, "");
  if (explicit) {
    try {
      return new URL(explicit).origin;
    } catch {
      // Fall through to request headers.
    }
  }

  const host = String(input.forwardedHost || input.host || "")
    .split(",")[0]
    .trim();
  if (!host) return "";

  const forwardedProto = String(input.forwardedProto || "")
    .split(",")[0]
    .trim()
    .replace(/:$/, "")
    .toLowerCase();
  const proto =
    forwardedProto ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${proto}://${host}`;
}

export function publicOriginFromRequestHeaders(headers: Headers): string {
  return resolvePublicAppOrigin({
    host: headers.get("host"),
    forwardedHost: headers.get("x-forwarded-host"),
    forwardedProto: headers.get("x-forwarded-proto"),
    envOrigin: process.env.CMP_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || "",
  });
}
