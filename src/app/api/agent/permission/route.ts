import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { authenticateApiKey } from "@/lib/api-key-auth";
import {
  resolveActiveMembership,
  resolveLocalOrganization,
  resolveLocalUser,
} from "@/lib/api-auth-helpers";
import {
  evaluateConsentForTenant,
  logConsentEvaluation,
} from "@/lib/consent-evaluation";
import { parseConsentEvaluationBody } from "@/lib/consent-evaluation-http";
import { logger } from "@/lib/logger";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { readPublicJsonObject } from "@/lib/sdk/public-http";
import { redactValue, validateRedactionPolicy } from "@/lib/redaction-core";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-Id",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function POST(request: Request) {
  const requestId = randomUUID();
  try {
    const identity = await resolveCaller(request);
    if (!identity.ok) {
      return NextResponse.json(
        { success: false, message: identity.message, requestId },
        { status: identity.status, headers: CORS_HEADERS },
      );
    }

    const limit = rateLimit({
      key: `agent-permission:${identity.organizationId}:${getClientIp(request)}`,
      limit: 300,
      windowMs: 60_000,
    });
    if (!limit.allowed) return rateLimitResponse(limit, CORS_HEADERS);

    const json = await readPublicJsonObject(request);
    if (!json.ok) {
      return NextResponse.json(
        { success: false, message: json.message, requestId },
        { status: json.status, headers: CORS_HEADERS },
      );
    }
    const parsed = parseConsentEvaluationBody(json.body, {
      legacyAgentFields: true,
    });
    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, message: parsed.error.message, requestId },
        { status: 400, headers: CORS_HEADERS },
      );
    }
    const hasContext = Object.prototype.hasOwnProperty.call(json.body, "context");
    const redactionPolicy = hasContext
      ? validateRedactionPolicy(json.body.redactionPolicy)
      : null;
    if (hasContext && (!redactionPolicy || !redactionPolicy.ok)) {
      return NextResponse.json(
        { success: false, message: redactionPolicy && !redactionPolicy.ok ? redactionPolicy.message : "redactionPolicy is required for agent context", requestId },
        { status: 400, headers: CORS_HEADERS },
      );
    }
    const evaluationRequest = redactionPolicy?.ok ? {
      ...parsed.value.request,
      purposeKeys: [...new Set([...parsed.value.request.purposeKeys, ...redactionPolicy.policy.fields.flatMap((rule) => rule.purposeKeys ?? [])])],
      dataCategories: [...new Set([...parsed.value.request.dataCategories, ...redactionPolicy.policy.fields.flatMap((rule) => rule.dataCategories ?? [])])],
    } : parsed.value.request;

    const evaluation = await evaluateConsentForTenant(
      {
        organizationId: identity.organizationId,
        websiteId: parsed.value.websiteId,
        consentId: parsed.value.consentId,
      },
      evaluationRequest,
    );
    if (!evaluation) {
      return NextResponse.json(
        { success: false, message: "Consent record not found", requestId },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    await logConsentEvaluation({
      organizationId: identity.organizationId,
      apiKeyId: identity.apiKeyId,
      userId: identity.userId,
      requestId,
      source: identity.apiKeyId ? "api" : "dashboard",
      evaluation,
      request: evaluationRequest,
    });

    const redactedContext = redactionPolicy?.ok
      ? redactValue(json.body.context, redactionPolicy.policy, {
          allowedPurposeKeys: new Set(evaluation.result.results.purposes.filter((item) => item.allowed).map((item) => item.requested.toLowerCase())),
          allowedDataCategories: new Set(evaluation.result.results.dataCategories.filter((item) => item.allowed).map((item) => item.requested.toLowerCase())),
        })
      : null;

    return NextResponse.json(
      {
        success: true,
        requestId,
        allowed: evaluation.result.allowed,
        reasonCode: evaluation.result.reasonCode,
        consentState: evaluation.result.consentState,
        results: evaluation.result.results,
        reasons: [
          ...evaluation.result.results.purposes,
          ...evaluation.result.results.vendors,
        ]
          .filter((item) => !item.allowed)
          .map((item) => `${item.requested}: ${item.reasonCode}`),
        purposeDetails: evaluation.result.results.purposes.map((item) => ({
          key: item.requested,
          allowed: item.allowed,
          reason: item.reasonCode,
        })),
        vendorDetails: evaluation.result.results.vendors.map((item) => ({
          domain: item.requested,
          allowed: item.allowed,
          reason: item.reasonCode,
        })),
        ...(redactedContext ? {
          context: redactedContext.value,
          redaction: { removedPaths: redactedContext.removedPaths },
        } : {}),
      },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    logger.error("Agent permission evaluation failed", {
      route: "POST /api/agent/permission",
      operation: "agent.permission.evaluate",
      requestId,
      error,
    });
    return NextResponse.json(
      { success: false, message: "Failed to evaluate agent permissioning", requestId },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

async function resolveCaller(request: Request): Promise<
  | {
      ok: true;
      organizationId: string;
      apiKeyId?: string;
      userId?: string;
    }
  | { ok: false; status: 401 | 403; message: string }
> {
  if (request.headers.has("authorization")) {
    const apiKey = await authenticateApiKey(request, "consent:evaluate");
    if (!apiKey.ok) {
      return {
        ok: false,
        status: apiKey.reason === "insufficient_scope" ? 403 : 401,
        message:
          apiKey.reason === "insufficient_scope"
            ? "API key lacks the required scope"
            : "A valid bearer API key is required",
      };
    }
    return {
      ok: true,
      organizationId: apiKey.context.organizationId,
      apiKeyId: apiKey.context.apiKeyId,
    };
  }

  const session = await auth();
  if (!session.isAuthenticated || !session.userId || !session.orgId) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }
  const [user, organization] = await Promise.all([
    resolveLocalUser(session.userId),
    resolveLocalOrganization(session.orgId),
  ]);
  if (!user || !organization) {
    return { ok: false, status: 403, message: "Organization access denied" };
  }
  const membership = await resolveActiveMembership(organization.id, user.id);
  if (!membership) {
    return { ok: false, status: 403, message: "Organization access denied" };
  }
  return {
    ok: true,
    organizationId: organization.id,
    userId: user.id,
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

