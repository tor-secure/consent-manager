import { NextResponse } from "next/server";

import { isRightAvailable, normalizeRightsJurisdiction } from "@/lib/privacy-rights/applicability";
import { createRightsRequest, resolveIntakeWebsite } from "@/lib/privacy-rights/service";
import {
  isRequesterKind,
  isRightsRequestType,
} from "@/lib/privacy-rights/types";
import { logger } from "@/lib/logger";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit-store";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const websiteId = String(body.websiteId ?? "").trim();
    const requestType = String(body.requestType ?? "").trim().toLowerCase();
    const requesterName = String(body.requesterName ?? "").trim().slice(0, 255);
    const requesterEmail = String(body.requesterEmail ?? "").trim().toLowerCase().slice(0, 320);
    const requesterPhone = body.requesterPhone
      ? String(body.requesterPhone).trim().slice(0, 50)
      : null;
    const description = String(body.description ?? "").trim().slice(0, 5000);
    const consentId = body.consentId ? String(body.consentId).trim().slice(0, 255) : null;
    const jurisdiction = normalizeRightsJurisdiction(body.jurisdiction);
    const requesterKind = isRequesterKind(body.requesterKind)
      ? body.requesterKind
      : "direct_requester";
    const agentAuthorizationNote = body.agentAuthorizationNote
      ? String(body.agentAuthorizationNote).trim().slice(0, 2000)
      : null;

    if (!websiteId) {
      return NextResponse.json({ success: false, message: "websiteId is required" }, { status: 400 });
    }

    const limit = await consumeRateLimit({
      key: `rights-request:${websiteId}:${getClientIp(request)}`,
      limit: 5,
      windowMs: 60 * 60_000,
    });
    if (!limit.allowed) return rateLimitResponse(limit);

    if (!isRightsRequestType(requestType)) {
      return NextResponse.json({ success: false, message: "Unsupported requestType" }, { status: 400 });
    }
    if (!isRightAvailable(jurisdiction, requestType)) {
      return NextResponse.json(
        { success: false, message: "That right is not configured for the selected jurisdiction" },
        { status: 400 },
      );
    }
    if (!requesterName) {
      return NextResponse.json({ success: false, message: "requesterName is required" }, { status: 400 });
    }
    if (!requesterEmail || !EMAIL_RE.test(requesterEmail)) {
      return NextResponse.json({ success: false, message: "A valid requesterEmail is required" }, { status: 400 });
    }
    if (!description) {
      return NextResponse.json({ success: false, message: "description is required" }, { status: 400 });
    }
    if (requesterKind === "authorized_agent" && !agentAuthorizationNote) {
      return NextResponse.json(
        { success: false, message: "agentAuthorizationNote is required for authorized-agent requests" },
        { status: 400 },
      );
    }

    const resolved = await resolveIntakeWebsite(websiteId);
    if (!resolved) {
      return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
    }

    const created = await createRightsRequest({
      organizationId: resolved.organization.id,
      websiteId: resolved.website.id,
      requestType,
      jurisdiction: body.jurisdiction ?? resolved.website.defaultRegulationKey ?? jurisdiction,
      requesterName,
      requesterEmail,
      requesterPhone,
      requesterKind,
      agentAuthorizationNote,
      consentId,
      description,
    });

    return NextResponse.json(
      {
        success: true,
        requestId: created.request.id,
        requesterReference: created.request.requesterReference,
        jurisdiction: created.request.jurisdiction,
        status: "verification required",
        acknowledgeBy: created.deadlines.acknowledgeBy.toISOString(),
        dueAt: created.deadlines.dueAt.toISOString(),
        deadlineKind: created.deadlines.deadlineKind,
        verificationExpiresAt: created.tokens.verificationExpiresAt.toISOString(),
        message:
          "Request received. Use the requester reference if you contact the organization. A verification challenge is issued out of band; this response does not include proof tokens.",
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Rights request intake failed", {
      operation: "rights_request.create",
      error,
    });
    return NextResponse.json({ success: false, message: "Failed to submit request" }, { status: 500 });
  }
}
