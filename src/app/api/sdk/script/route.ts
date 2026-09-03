import { NextResponse } from "next/server";
import { buildGenericCmpSdkScript } from "@/lib/sdk/cmp-sdk-script";
import {
  isSafeApiBase,
  isValidSiteKey,
  publicCorsHeaders,
  publicOptionsResponse,
} from "@/lib/sdk/public-http";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// GET /api/sdk/script
// Public, CORS-enabled endpoint that serves the browser CMP SDK JavaScript.
//
// The SDK uses RUNTIME detection of siteKey/apiBase so the same script URL
// works for all websites:
//   - siteKey resolved from <script data-site-key="..."> OR window.__CMP_SITE_KEY
//   - apiBase resolved from <script data-api-base="..."> OR
//     window.__CMP_API_BASE OR the script's own origin (protocol://host).
//
// This endpoint returns a raw JavaScript file with the proper Content-Type
// so it can be used directly as a <script src="..."> from any website.
// ---------------------------------------------------------------------------

const CACHE_SECONDS = 300; // 5 minutes

export async function GET(request: Request) {
  try {
    const js = buildGenericCmpSdkScript();

    const { searchParams } = new URL(request.url);
    const siteKeyParam = searchParams.get("siteKey")?.trim() ?? "";
    const apiBaseParam = searchParams.get("apiBase")?.trim() ?? "";

    let body = js;

    if (siteKeyParam || apiBaseParam) {
      const injections: string[] = [];
      if (siteKeyParam && isValidSiteKey(siteKeyParam)) {
        injections.push(
          `  window.__CMP_SITE_KEY = window.__CMP_SITE_KEY || ${JSON.stringify(
            siteKeyParam,
          )};`,
        );
      }
      if (apiBaseParam && isSafeApiBase(apiBaseParam)) {
        injections.push(
          `  window.__CMP_API_BASE = window.__CMP_API_BASE || ${JSON.stringify(
            apiBaseParam,
          )};`,
        );
      }
      if (injections.length > 0) {
        const block = `(function(){${injections.join("")}})();\n`;
        body = block + js;
      }
    }

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        ...publicCorsHeaders("GET, OPTIONS"),
        "Cache-Control": `public, max-age=${CACHE_SECONDS}, stale-while-revalidate=86400`,
      },
    });
  } catch (error) {
    logger.error("SDK script generation failed", {
      route: "GET /api/sdk/script",
      operation: "sdk.script.generate",
      error,
    });
    return new NextResponse(
      "// CMP SDK failed to generate. Please try again later.\n" +
        "console.error('[CMP] Failed to load SDK');\n",
      {
        status: 500,
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          ...publicCorsHeaders("GET, OPTIONS"),
        },
      },
    );
  }
}

// CORS preflight — this script is loaded cross-origin from external websites.
export async function OPTIONS() {
  return publicOptionsResponse("GET, OPTIONS");
}
