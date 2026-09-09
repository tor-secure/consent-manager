import "server-only";

import type { ConsentEvaluationRequest } from "@/lib/consent-evaluation-core";
import { isValidConsentId, isValidWebsiteId } from "@/lib/sdk/public-http";

const MAX_ITEMS_PER_KIND = 100;
const PURPOSE_KEY_RE = /^[a-z0-9][a-z0-9_-]{0,99}$/;
const DOMAIN_RE =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export type ParsedConsentEvaluationBody = {
  consentId: string;
  websiteId: string;
  request: ConsentEvaluationRequest;
};

export type ConsentEvaluationBodyError = {
  code: "VALIDATION_ERROR";
  message: string;
};

export function parseConsentEvaluationBody(
  body: Record<string, unknown>,
  options: { legacyAgentFields?: boolean } = {},
):
  | { ok: true; value: ParsedConsentEvaluationBody }
  | { ok: false; error: ConsentEvaluationBodyError } {
  const legacy = options.legacyAgentFields === true;
  const allowedFields = new Set([
    "consentId",
    "websiteId",
    legacy ? "requestedPurposeKeys" : "purposeKeys",
    legacy ? "requestedVendorDomains" : "vendorDomains",
    ...(legacy ? [] : ["trackerIds", "dataCategories"]),
  ]);
  const unknownField = Object.keys(body).find((key) => !allowedFields.has(key));
  if (unknownField) return invalid(`Unknown field: ${unknownField}`);

  if (typeof body.consentId !== "string" || !isValidConsentId(body.consentId.trim())) {
    return invalid("consentId must be a valid consent identifier");
  }
  if (typeof body.websiteId !== "string" || !isValidWebsiteId(body.websiteId.trim())) {
    return invalid("websiteId must be a UUID");
  }

  const purposeKeys = readStringArray(
    body[legacy ? "requestedPurposeKeys" : "purposeKeys"],
    legacy ? "requestedPurposeKeys" : "purposeKeys",
    (value) => PURPOSE_KEY_RE.test(value),
    "lower",
  );
  if (!purposeKeys.ok) return purposeKeys;

  const vendorDomains = readStringArray(
    body[legacy ? "requestedVendorDomains" : "vendorDomains"],
    legacy ? "requestedVendorDomains" : "vendorDomains",
    (value) => DOMAIN_RE.test(value),
    "lower",
  );
  if (!vendorDomains.ok) return vendorDomains;

  const trackerIds = legacy
    ? ({ ok: true, value: [] as string[] } as const)
    : readStringArray(body.trackerIds, "trackerIds", isValidWebsiteId, "lower");
  if (!trackerIds.ok) return trackerIds;

  const dataCategories = legacy
    ? ({ ok: true, value: [] as string[] } as const)
    : readStringArray(
        body.dataCategories,
        "dataCategories",
        (value) => value.length <= 255,
        "preserve",
      );
  if (!dataCategories.ok) return dataCategories;

  const request = {
    purposeKeys: purposeKeys.value,
    vendorDomains: vendorDomains.value,
    trackerIds: trackerIds.value,
    dataCategories: dataCategories.value,
  };
  const totalItems = Object.values(request).reduce((sum, values) => sum + values.length, 0);
  if (totalItems === 0) return invalid("At least one requested item is required");

  return {
    ok: true,
    value: {
      consentId: body.consentId.trim(),
      websiteId: body.websiteId.trim().toLowerCase(),
      request,
    },
  };
}

function readStringArray(
  value: unknown,
  field: string,
  validate: (value: string) => boolean,
  casing: "lower" | "preserve",
):
  | { ok: true; value: string[] }
  | { ok: false; error: ConsentEvaluationBodyError } {
  if (value === undefined) return { ok: true, value: [] };
  if (!Array.isArray(value) || value.length > MAX_ITEMS_PER_KIND) {
    return invalid(`${field} must be an array of at most ${MAX_ITEMS_PER_KIND} strings`);
  }

  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") return invalid(`${field} must contain only strings`);
    const trimmed = item.trim();
    const comparable = trimmed.toLowerCase();
    if (!trimmed || !validate(comparable) || seen.has(comparable)) {
      return invalid(`${field} contains an invalid or duplicate value`);
    }
    seen.add(comparable);
    normalized.push(casing === "lower" ? comparable : trimmed);
  }
  return { ok: true, value: normalized };
}

function invalid(
  message: string,
): { ok: false; error: ConsentEvaluationBodyError } {
  return { ok: false, error: { code: "VALIDATION_ERROR", message } };
}
