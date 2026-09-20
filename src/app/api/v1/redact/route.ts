import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { evaluateConsentForTenant, logConsentEvaluation } from "@/lib/consent-evaluation";
import { logger } from "@/lib/logger";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit-store";
import { redactValue, validateRedactionPolicy } from "@/lib/redaction-core";
import { isValidConsentId, isValidWebsiteId, readPublicJsonObject } from "@/lib/sdk/public-http";

const HEADERS = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export async function POST(request: Request) {
  const requestId = randomUUID();
  try {
    const authentication = await authenticateApiKey(request, "data:redact");
    if (!authentication.ok) {
      return response(authentication.reason === "insufficient_scope" ? 403 : 401, requestId, "API key is invalid or lacks data:redact");
    }
    const limit = await consumeRateLimit({
      key: `redact:${authentication.context.apiKeyId}:${getClientIp(request)}`,
      limit: 300,
      windowMs: 60_000,
    });
    if (!limit.allowed) return response(429, requestId, "Too many requests");
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return response(415, requestId, "Content-Type must be application/json");
    }
    const json = await readPublicJsonObject(request);
    if (!json.ok) return response(json.status, requestId, json.message);
    const websiteId = typeof json.body.websiteId === "string" ? json.body.websiteId : "";
    const consentId = typeof json.body.consentId === "string" ? json.body.consentId : "";
    if (!isValidWebsiteId(websiteId) || !isValidConsentId(consentId)) {
      return response(400, requestId, "Invalid websiteId or consentId");
    }
    if (!validJsonShape(json.body.data)) return response(400, requestId, "data exceeds depth or item limits");
    const policy = validateRedactionPolicy(json.body.policy);
    if (!policy.ok) return response(400, requestId, policy.message);

    const purposeKeys = [...new Set(policy.policy.fields.flatMap((rule) => rule.purposeKeys ?? []))];
    const dataCategories = [...new Set(policy.policy.fields.flatMap((rule) => rule.dataCategories ?? []))];
    const evaluation = await evaluateConsentForTenant(
      { organizationId: authentication.context.organizationId, websiteId, consentId },
      { purposeKeys, dataCategories, vendorDomains: [], trackerIds: [] },
    );
    if (!evaluation) return response(404, requestId, "Consent record not found");

    const result = redactValue(json.body.data, policy.policy, {
      allowedPurposeKeys: new Set(evaluation.result.results.purposes.filter((item) => item.allowed).map((item) => item.requested.toLowerCase())),
      allowedDataCategories: new Set(evaluation.result.results.dataCategories.filter((item) => item.allowed).map((item) => item.requested.toLowerCase())),
    });
    await Promise.all([
      logConsentEvaluation({
        organizationId: authentication.context.organizationId,
        apiKeyId: authentication.context.apiKeyId,
        requestId,
        source: "api",
        evaluation,
        request: { purposeKeys, dataCategories, vendorDomains: [], trackerIds: [] },
      }),
      db.insert(auditLogs).values({
        organizationId: authentication.context.organizationId,
        action: "data.redacted",
        resourceType: "consent_record",
        resourceId: evaluation.recordId,
        description: "Payload redacted using canonical consent evaluation",
        metadata: { requestId, apiKeyId: authentication.context.apiKeyId, removedFieldCount: result.removedPaths.length },
      }),
    ]);
    return NextResponse.json({
      success: true,
      requestId,
      consentState: evaluation.result.consentState,
      data: result.value,
      redaction: { removedPaths: result.removedPaths },
    }, { headers: { ...HEADERS, "X-Request-Id": requestId } });
  } catch (error) {
    logger.error("Redaction request failed", { operation: "data.redact", requestId, error });
    return response(500, requestId, "Failed to redact payload");
  }
}

function validJsonShape(value: unknown): boolean {
  let nodes = 0;
  function visit(item: unknown, depth: number): boolean {
    nodes += 1;
    if (nodes > 5_000 || depth > 12) return false;
    if (Array.isArray(item)) return item.length <= 1_000 && item.every((child) => visit(child, depth + 1));
    if (item && typeof item === "object") {
      const entries = Object.entries(item);
      return entries.length <= 500 && entries.every(([key, child]) => key.length <= 200 && visit(child, depth + 1));
    }
    return item === null || ["string", "number", "boolean"].includes(typeof item);
  }
  return visit(value, 0);
}

function response(status: number, requestId: string, message: string) {
  return NextResponse.json({ success: false, requestId, message }, { status, headers: HEADERS });
}
