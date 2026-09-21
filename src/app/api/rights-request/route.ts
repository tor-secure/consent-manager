import { NextResponse } from "next/server";

import { isRightAvailable, normalizeRightsJurisdiction } from "@/lib/privacy-rights/applicability";
import {
  buildIntakeDescription,
  requestHostFromHeaders,
  sanitizeDataCategories,
  sanitizePreferredLanguage,
} from "@/lib/privacy-rights/intake-fields";
import {
  createRightsRequest,
  resolveIntakeWebsite,
  resolveIntakeWebsiteByHost,
  resolveIntakeWebsiteBySiteKey,
} from "@/lib/privacy-rights/service";
import {
  isRequesterKind,
  isRightsRequestType,
} from "@/lib/privacy-rights/types";
import { isValidSiteKey, isValidWebsiteId } from "@/lib/sdk/public-http";
import { logger } from "@/lib/logger";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit-store";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const websiteId = String(body.websiteId ?? "").trim();
    const siteKey = String(body.siteKey ?? "").trim();
    const requestType = String(body.requestType ?? "").trim().toLowerCase();
    const requesterName = String(body.requesterName ?? "").trim().slice(0, 255);
    const requesterEmail = String(body.requesterEmail ?? "").trim().toLowerCase().slice(0, 320);
    const requesterPhone = body.requesterPhone
      ? String(body.requesterPhone).trim().slice(0, 50)
      : null;
    const description = String(body.description ?? "").trim().slice(0, 5000);
    const identityProof = String(body.identityProof ?? body.identityProofDescription ?? "")
      .trim()
      .slice(0, 2000);
    const dataCategories = sanitizeDataCategories(body.dataCategories);
    const preferredLanguage = sanitizePreferredLanguage(body.preferredLanguage);
    const processingConsent = body.processingConsent === true || body.processingConsent === "true";
    const fulfillConsent = body.fulfillConsent === true || body.fulfillConsent === "true";
    const consentId = body.consentId ? String(body.consentId).trim().slice(0, 255) : null;
    const jurisdiction = normalizeRightsJurisdiction(body.jurisdiction);
    const requesterKind = isRequesterKind(body.requesterKind)
      ? body.requesterKind
      : "direct_requester";
    const agentAuthorizationNote = body.agentAuthorizationNote
      ? String(body.agentAuthorizationNote).trim().slice(0, 2000)
      : null;

    let resolved = websiteId && isValidWebsiteId(websiteId)
      ? await resolveIntakeWebsite(websiteId)
      : null;
    if (!resolved && siteKey && isValidSiteKey(siteKey)) {
      resolved = await resolveIntakeWebsiteBySiteKey(siteKey);
    }
    const host = requestHostFromHeaders(request);
    if (!resolved) {
      resolved = await resolveIntakeWebsiteByHost(host);
    }
    if (
      !resolved &&
      (host === "localhost" || host === "127.0.0.1" || host.endsWith("consentguru.com"))
    ) {
      resolved = await resolveIntakeWebsiteByHost("consentguru.com");
    }

    const rateKey = resolved?.website.id ?? siteKey ?? websiteId ?? requestHostFromHeaders(request);
    const limit = await consumeRateLimit({
      key: `rights-request:${rateKey}:${getClientIp(request)}`,
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
    const hasConsentFields = Object.prototype.hasOwnProperty.call(body, "processingConsent")
      || Object.prototype.hasOwnProperty.call(body, "fulfillConsent");
    if (hasConsentFields && (!processingConsent || !fulfillConsent)) {
      return NextResponse.json(
        { success: false, message: "Consent to process this request is required" },
        { status: 400 },
      );
    }
    if (requesterKind === "authorized_agent" && !agentAuthorizationNote) {
      return NextResponse.json(
        { success: false, message: "agentAuthorizationNote is required for authorized-agent requests" },
        { status: 400 },
      );
    }
    if (!resolved) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This site is not configured to receive Data Principal requests. Email shijas@consentguru.com.",
        },
        { status: 404 },
      );
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
      description: buildIntakeDescription({
        description,
        identityProof,
        dataCategories,
        preferredLanguage,
      }),
    });

    return NextResponse.json(
      {
        success: true,
        requestId: created.request.id,
        requesterReference: created.request.requesterReference,
        ticketId: created.request.requesterReference,
        jurisdiction: created.request.jurisdiction,
        status: "verification required",
        acknowledgeBy: created.deadlines.acknowledgeBy.toISOString(),
        dueAt: created.deadlines.dueAt.toISOString(),
        deadlineKind: created.deadlines.deadlineKind,
        verificationExpiresAt: created.tokens.verificationExpiresAt.toISOString(),
        message:
          "Request received. Save your ticket ID to track this request. A verification challenge is issued out of band; this response does not include proof tokens.",
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
