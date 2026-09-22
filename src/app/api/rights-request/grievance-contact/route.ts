import { NextResponse } from "next/server";

import { loadGrievancePortalContact } from "@/lib/privacy-rights/grievance-portal";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit-store";
import {
  isValidSiteKey,
  publicCorsHeaders,
  publicOptionsResponse,
} from "@/lib/sdk/public-http";

const CORS = publicCorsHeaders("GET, OPTIONS");

export async function OPTIONS() {
  return publicOptionsResponse("GET, OPTIONS");
}

export async function GET(request: Request) {
  const limit = await consumeRateLimit({
    key: `grievance-contact:${getClientIp(request)}`,
    limit: 60,
    windowMs: 15 * 60_000,
  });
  if (!limit.allowed) return rateLimitResponse(limit, CORS);

  const siteKey = new URL(request.url).searchParams.get("siteKey")?.trim() ?? "";
  const contact = await loadGrievancePortalContact(
    siteKey && isValidSiteKey(siteKey) ? siteKey : null,
  );

  return NextResponse.json(
    {
      success: true,
      contact,
      responseTime: "Within 7 days as per DPDP Act Section 13",
    },
    { headers: { ...CORS, "Cache-Control": "public, max-age=60" } },
  );
}
