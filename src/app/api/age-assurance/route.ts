import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { startAgeAssertion } from "@/lib/children/service";
import { verifyAgeContext } from "@/lib/children/context";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { publicCorsHeaders, publicOptionsResponse } from "@/lib/sdk/public-http";

const CORS = publicCorsHeaders("POST, OPTIONS");

export async function OPTIONS() {
  return publicOptionsResponse("POST, OPTIONS");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const siteKey = String(body.siteKey ?? "").trim();
  const websiteId = String(body.websiteId ?? "").trim();
  const assertion = String(body.assertion ?? "").trim().toLowerCase();
  const consentId = body.consentId ? String(body.consentId).trim() : null;
  if (!siteKey || !websiteId) {
    return NextResponse.json({ success: false, message: "websiteId and siteKey are required" }, { status: 400, headers: CORS });
  }
  if (assertion !== "over" && assertion !== "under") {
    return NextResponse.json({ success: false, message: "assertion must be over or under" }, { status: 400, headers: CORS });
  }
  const limit = rateLimit({
    key: `age-assurance:${websiteId}:${getClientIp(request)}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!limit.allowed) return rateLimitResponse(limit, CORS);

  const [website] = await db
    .select({ id: websites.id, organizationId: websites.organizationId, siteKey: websites.siteKey })
    .from(websites)
    .where(and(eq(websites.id, websiteId), eq(websites.siteKey, siteKey), eq(websites.status, "active")))
    .limit(1);
  if (!website) {
    return NextResponse.json({ success: false, message: "Website not found" }, { status: 404, headers: CORS });
  }

  if (body.ageStatus || body.guardianVerified === true || body.validated === true) {
    return NextResponse.json(
      { success: false, message: "Client age or guardian claims are ignored." },
      { status: 400, headers: CORS },
    );
  }
  if (typeof body.ageContext === "string") {
    const verified = verifyAgeContext(body.ageContext, {
      organizationId: website.organizationId,
      websiteId: website.id,
    });
    if (!verified.ok && verified.reason === "tenant_mismatch") {
      return NextResponse.json({ success: false, message: "Invalid age context" }, { status: 403, headers: CORS });
    }
  }

  const created = await startAgeAssertion({
    organizationId: website.organizationId,
    websiteId: website.id,
    consentId,
    assertedOverThreshold: assertion === "over",
    method: "self_declaration",
  });
  if (!created.ok) {
    return NextResponse.json({ success: false, message: "Unable to record age assertion" }, { status: 400, headers: CORS });
  }

  return NextResponse.json({
    success: true,
    sessionId: created.sessionId,
    age: created.view,
    ageContext: created.ageContext,
    guardianToken: created.guardianToken,
    notice: created.view.restrictedProcessingAllowed
      ? "Age was recorded. Self-declaration is not verified assurance."
      : created.view.guardianRequired
        ? "A parent or guardian must approve these optional features."
        : "Some optional features require age verification.",
  }, { headers: CORS });
}
