import { NextResponse } from "next/server";

import { buildConsentReceiptPdf } from "@/lib/consent-receipt-pdf";
import { loadPublicConsentReceipt } from "@/lib/consent-receipt";
import { logger } from "@/lib/logger";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit-store";
import { sdkOriginGuard } from "@/lib/sdk/origin-allowlist";
import {
  isValidConsentId,
  isValidSiteKey,
  isValidWebsiteId,
  publicCorsHeaders,
  publicOptionsResponse,
} from "@/lib/sdk/public-http";

const CORS = publicCorsHeaders("GET, OPTIONS");

export async function OPTIONS() {
  return publicOptionsResponse("GET, OPTIONS");
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const consentId = url.searchParams.get("consentId")?.trim() ?? "";
    const websiteId = url.searchParams.get("websiteId")?.trim() ?? "";
    const siteKey = url.searchParams.get("siteKey")?.trim() ?? "";
    const download = url.searchParams.get("download") === "1" || url.searchParams.get("format") === "pdf";

    if (!consentId || !websiteId || !siteKey) {
      return NextResponse.json(
        { success: false, message: "consentId, websiteId, and siteKey are required" },
        { status: 400, headers: CORS },
      );
    }
    if (!isValidConsentId(consentId) || !isValidWebsiteId(websiteId) || !isValidSiteKey(siteKey)) {
      return NextResponse.json(
        { success: false, message: "Invalid parameter format" },
        { status: 400, headers: CORS },
      );
    }

    const limit = await consumeRateLimit({
      key: `consent-receipt:${websiteId}:${getClientIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!limit.allowed) return rateLimitResponse(limit, CORS);

    const loaded = await loadPublicConsentReceipt({ consentId, websiteId, siteKey });
    if (!loaded.ok) {
      return NextResponse.json(
        { success: false, message: loaded.message },
        { status: loaded.status, headers: CORS },
      );
    }

    const originError = sdkOriginGuard(request, loaded.website, CORS);
    if (originError) return originError;

    if (!download) {
      return NextResponse.json({ success: true, receipt: loaded.receipt }, { headers: CORS });
    }

    const bytes = await buildConsentReceiptPdf(loaded.receipt);
    const filename = `consent-receipt-${consentId.replace(/[^A-Za-z0-9_-]/g, "_")}.pdf`;
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        ...CORS,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "Access-Control-Expose-Headers": "Content-Disposition",
      },
    });
  } catch (error) {
    logger.error("Consent receipt failed", { operation: "consent.receipt.get", error });
    return NextResponse.json(
      { success: false, message: "Failed to build consent receipt" },
      { status: 500, headers: CORS },
    );
  }
}
