import { isUuid } from "@/lib/trackers/management";
import { sanitizeHttpUrl } from "@/lib/safe-url";
import { parseCcpaApplicability } from "../ccpa/types";
import {
  parseDpaStatus,
  parseDownstreamDsarMode,
  parseRelationshipType,
  parseStringList,
  parseTransferMechanism,
  parseVendorRole,
  parseVendorStatus,
  TRANSFER_DESTINATION_TYPES,
} from "./types";

function optionalText(value: unknown, max = 255): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const next = String(value).trim();
  return next.length > 0 ? next.slice(0, max) : null;
}

function optionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function parseVendorPatch(body: Record<string, unknown>) {
  const statusRaw = body.status === undefined ? undefined : parseVendorStatus(body.status);
  const archive = body.action === "archive" || statusRaw === "archived";
  return {
    name: optionalText(body.name),
    legalName: optionalText(body.legalName),
    domain: optionalText(body.domain),
    websiteUrl: optionalText(body.websiteUrl, 500),
    privacyPolicyUrl: body.privacyPolicyUrl === undefined
      ? undefined
      : (sanitizeHttpUrl(optionalText(body.privacyPolicyUrl, 500) ?? "") || null),
    country: optionalText(body.country, 8),
    description: optionalText(body.description, 4000),
    role: body.role === undefined ? undefined : parseVendorRole(body.role),
    processingCountries: body.processingCountries === undefined ? undefined : parseStringList(body.processingCountries),
    dpaStatus: body.dpaStatus === undefined ? undefined : parseDpaStatus(body.dpaStatus),
    dpaEffectiveAt: optionalDate(body.dpaEffectiveAt),
    dpaReviewAt: optionalDate(body.dpaReviewAt),
    dpaReference: optionalText(body.dpaReference),
    downstreamDsarMode: body.downstreamDsarMode === undefined ? undefined : parseDownstreamDsarMode(body.downstreamDsarMode),
    ccpaSale: body.ccpaSale === undefined ? undefined : parseCcpaApplicability(body.ccpaSale),
    ccpaShare: body.ccpaShare === undefined ? undefined : parseCcpaApplicability(body.ccpaShare),
    ccpaSensitivePi: body.ccpaSensitivePi === undefined ? undefined : parseCcpaApplicability(body.ccpaSensitivePi),
    status: archive ? "archived" as const : statusRaw,
    archive,
  };
}

export function parseActivityWrite(body: Record<string, unknown>) {
  const vendorId = String(body.vendorId ?? "").trim();
  const hasWebsite = Object.prototype.hasOwnProperty.call(body, "websiteId");
  const hasPurpose = Object.prototype.hasOwnProperty.call(body, "purposeId");
  const websiteRaw = hasWebsite ? body.websiteId : undefined;
  const purposeRaw = hasPurpose ? body.purposeId : undefined;
  const websiteId = websiteRaw === undefined
    ? undefined
    : websiteRaw === null || websiteRaw === ""
      ? null
      : String(websiteRaw).trim();
  const purposeId = purposeRaw === undefined
    ? undefined
    : purposeRaw === null || purposeRaw === ""
      ? null
      : String(purposeRaw).trim();
  return {
    vendorId: isUuid(vendorId) ? vendorId : null,
    websiteId: websiteId === undefined ? undefined : websiteId === null ? null : isUuid(websiteId) ? websiteId : "invalid",
    purposeId: purposeId === undefined ? undefined : purposeId === null ? null : isUuid(purposeId) ? purposeId : "invalid",
    description: optionalText(body.description, 4000) ?? null,
    dataCategories: parseStringList(body.dataCategories),
    sensitive: body.sensitive === true,
    sourceOfData: optionalText(body.sourceOfData) ?? null,
    recipients: parseStringList(body.recipients),
    retentionPeriod: optionalText(body.retentionPeriod) ?? null,
    processingRole: parseVendorRole(body.processingRole ?? body.role),
    processingLocation: optionalText(body.processingLocation, 100) ?? null,
    transferRequired: body.transferRequired === true,
    legalBasis: optionalText(body.legalBasis, 50) ?? null,
    ccpaSale: body.ccpaSale === undefined ? undefined : parseCcpaApplicability(body.ccpaSale),
    ccpaShare: body.ccpaShare === undefined ? undefined : parseCcpaApplicability(body.ccpaShare),
    ccpaSensitivePi: body.ccpaSensitivePi === undefined ? undefined : parseCcpaApplicability(body.ccpaSensitivePi),
    status: body.status === undefined ? "active" : parseVendorStatus(body.status),
  };
}

export function parseTransferWrite(body: Record<string, unknown>) {
  const vendorId = String(body.vendorId ?? "").trim();
  const hasWebsite = Object.prototype.hasOwnProperty.call(body, "websiteId");
  const hasActivity = Object.prototype.hasOwnProperty.call(body, "processingActivityId");
  const websiteRaw = hasWebsite ? body.websiteId : undefined;
  const activityRaw = hasActivity ? body.processingActivityId : undefined;
  const websiteId = websiteRaw === undefined
    ? undefined
    : websiteRaw === null || websiteRaw === ""
      ? null
      : String(websiteRaw).trim();
  const activityId = activityRaw === undefined
    ? undefined
    : activityRaw === null || activityRaw === ""
      ? null
      : String(activityRaw).trim();
  const destinationType = String(body.destinationType ?? "vendor");
  return {
    vendorId: isUuid(vendorId) ? vendorId : null,
    websiteId: websiteId === undefined ? undefined : websiteId === null ? null : isUuid(websiteId) ? websiteId : "invalid",
    processingActivityId: activityId === undefined ? undefined : activityId === null ? null : isUuid(activityId) ? activityId : "invalid",
    sourceCountry: optionalText(body.sourceCountry, 8) ?? null,
    destinationCountry: optionalText(body.destinationCountry, 8) ?? null,
    destinationRegion: optionalText(body.destinationRegion, 32) ?? null,
    destinationType: (TRANSFER_DESTINATION_TYPES as readonly string[]).includes(destinationType)
      ? destinationType
      : "vendor",
    transferPurpose: optionalText(body.transferPurpose) ?? null,
    dataCategories: parseStringList(body.dataCategories),
    processingLocation: optionalText(body.processingLocation, 100) ?? null,
    mechanism: parseTransferMechanism(body.mechanism),
    safeguards: optionalText(body.safeguards, 4000) ?? null,
    documentationRef: optionalText(body.documentationRef) ?? null,
    notes: optionalText(body.notes, 4000) ?? null,
    effectiveAt: optionalDate(body.effectiveAt) ?? null,
    reviewAt: optionalDate(body.reviewAt) ?? null,
    status: body.status === undefined ? "active" : parseVendorStatus(body.status),
  };
}

export function parseRelationshipWrite(body: Record<string, unknown>) {
  const parentVendorId = String(body.parentVendorId ?? "").trim();
  const childVendorId = String(body.childVendorId ?? "").trim();
  return {
    parentVendorId: isUuid(parentVendorId) ? parentVendorId : null,
    childVendorId: isUuid(childVendorId) ? childVendorId : null,
    relationshipType: parseRelationshipType(body.relationshipType),
    status: body.status === undefined ? "active" : parseVendorStatus(body.status),
  };
}
