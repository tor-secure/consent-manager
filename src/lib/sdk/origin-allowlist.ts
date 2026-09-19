import { NextResponse } from "next/server";
import { isLoopbackHostname } from "@/lib/safe-url";
import { resolvePublicAppOrigin } from "@/lib/sdk/public-origin";

export function normalizeHostname(value: string): string {
  return value.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
}

export function hostnameMatchesWebsiteDomain(hostname: string, websiteDomain: string): boolean {
  const host = normalizeHostname(hostname);
  const expected = normalizeHostname(websiteDomain.split("/")[0] ?? "");
  if (!host || !expected) return false;
  return host === expected;
}

export function callerHostname(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).hostname;
    } catch {
      return null;
    }
  }
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).hostname;
    } catch {
      return null;
    }
  }
  return null;
}

export function isSdkOriginAllowed(
  request: Request,
  website: { domain: string; verified?: boolean | null },
): boolean {
  const host = callerHostname(request);
  if (!host) {
    return process.env.NODE_ENV !== "production";
  }
  if (isLoopbackHostname(host)) return true;

  const appOrigin = resolvePublicAppOrigin({
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    envOrigin: process.env.CMP_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || "",
  });
  if (appOrigin) {
    try {
      if (normalizeHostname(new URL(appOrigin).hostname) === normalizeHostname(host)) {
        return true;
      }
    } catch {
      /* ignore malformed public origin */
    }
  }

  if (!hostnameMatchesWebsiteDomain(host, website.domain)) return false;
  if (process.env.NODE_ENV === "production" && website.verified !== true) {
    return false;
  }
  return true;
}

export function sdkOriginGuard(
  request: Request,
  website: { domain: string; verified?: boolean | null },
  corsHeaders?: HeadersInit,
): NextResponse | null {
  if (isSdkOriginAllowed(request, website)) return null;
  const host = callerHostname(request);
  const message = !host
    ? "Origin is not allowed for this site"
    : `Origin is not allowed for this site. This site key is registered for ${website.domain}. Load the SDK from that host (not a different Vercel URL).`;
  return NextResponse.json(
    { success: false, message },
    { status: 403, headers: corsHeaders },
  );
}

