import { parseCcpaApplicability, type CcpaApplicability } from "../ccpa/types";

export const TRACKER_TYPES = [
  "cookie",
  "pixel",
  "script",
  "iframe",
  "beacon",
  "fingerprint",
  "storage",
  "other",
] as const;

export const TRACKER_STATUSES = ["active", "disabled", "archived"] as const;
export const SCANNER_CLASSIFICATIONS = ["unmapped", "mapped", "ignored"] as const;
export const TRACKER_PARTIES = ["first-party", "third-party", "unknown"] as const;
export const STORAGE_TYPES = ["cookie", "localStorage", "sessionStorage", "indexedDB"] as const;

export const TRACKER_AUDIT_ACTIONS = {
  created: "TRACKER_CREATED",
  updated: "TRACKER_UPDATED",
  disabled: "TRACKER_DISABLED",
  archived: "TRACKER_ARCHIVED",
  mapped: "TRACKER_MAPPED",
  unmapped: "TRACKER_UNMAPPED",
  purposeChanged: "TRACKER_PURPOSE_CHANGED",
  vendorChanged: "TRACKER_VENDOR_CHANGED",
  essentialChanged: "TRACKER_ESSENTIAL_CHANGED",
} as const;

export const ESSENTIAL_CONFIRMATION_TEXT =
  "This tracker will be allowed without optional consent according to the policy configuration. Only classify a tracker as essential when the organization has determined that it is necessary for the relevant service.";

export type TrackerType = (typeof TRACKER_TYPES)[number];
export type TrackerStatus = (typeof TRACKER_STATUSES)[number];
export type ScannerClassification = (typeof SCANNER_CLASSIFICATIONS)[number];
export type TrackerParty = (typeof TRACKER_PARTIES)[number];

export type TrackerPatternFields = {
  domain?: string | null;
  identifier?: string | null;
  scriptUrlPatterns?: string[];
  iframeUrlPatterns?: string[];
  pixelUrlPatterns?: string[];
};

export type TrackerMappingState = {
  purposeId: string | null;
  vendorId: string | null;
  isEssential: boolean;
  status: string;
  scannerClassification: string;
};

export type TrackerConfigSnapshot = TrackerMappingState &
  TrackerPatternFields & {
    name: string;
    type: string;
    category: string | null;
    cookieNames: string[];
    storageTypes: string[];
    localStorageKeys: string[];
    sessionStorageKeys: string[];
    indexedDbNames: string[];
    party: string;
    duration: string | null;
    deletionBehavior: string | null;
    description: string | null;
  };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function parseStringList(value: unknown, maxItems = 40): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]+/)
      : [];
  const unique = new Set<string>();
  for (const item of raw) {
    const trimmed = String(item ?? "").trim();
    if (!trimmed) continue;
    unique.add(trimmed.slice(0, 500));
    if (unique.size >= maxItems) break;
  }
  return [...unique];
}

export function validateDetectionPattern(pattern: string): string | null {
  const value = pattern.trim();
  if (!value) return "Pattern cannot be empty.";
  if (value.length > 500) return "Pattern is too long.";
  if (value === "*" || value === "**" || value === ".*") {
    return "Pattern is too broad. Use a domain, path, or cookie prefix.";
  }
  if ((value.match(/\*/g) || []).length > 8) {
    return "Pattern contains too many wildcards.";
  }
  if (value.startsWith("/") && value.lastIndexOf("/") > 0) {
    const lastSlash = value.lastIndexOf("/");
    const source = value.slice(1, lastSlash);
    const flags = value.slice(lastSlash + 1);
    if (!source) return "Regular expression cannot be empty.";
    if (flags && !/^[gimsuy]+$/.test(flags)) return "Invalid regular expression flags.";
    try {
      void new RegExp(source, flags);
    } catch {
      return "Invalid regular expression.";
    }
    return null;
  }
  try {
    void new RegExp(value.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*"));
  } catch {
    return "Invalid pattern.";
  }
  return null;
}

export function validatePatternList(patterns: string[]): string | null {
  for (const pattern of patterns) {
    const error = validateDetectionPattern(pattern);
    if (error) return error;
  }
  return null;
}

export function patternMatches(value: string | null | undefined, pattern: string): boolean {
  const normalizedValue = String(value ?? "").toLowerCase();
  const normalizedPattern = String(pattern ?? "").toLowerCase();
  if (!normalizedValue || !normalizedPattern) return false;
  if (normalizedPattern.startsWith("/") && normalizedPattern.lastIndexOf("/") > 0) {
    const lastSlash = pattern.lastIndexOf("/");
    try {
      return new RegExp(pattern.slice(1, lastSlash), pattern.slice(lastSlash + 1)).test(String(value));
    } catch {
      return false;
    }
  }
  if (!normalizedPattern.includes("*")) {
    return (
      normalizedValue === normalizedPattern ||
      normalizedValue.includes(normalizedPattern)
    );
  }
  const parts = normalizedPattern.split("*");
  let cursor = 0;
  for (const part of parts) {
    if (!part) continue;
    const index = normalizedValue.indexOf(part, cursor);
    if (index === -1) return false;
    cursor = index + part.length;
  }
  return true;
}

export function trackerMatchesDetection(
  rule: TrackerPatternFields,
  detection: { url?: string | null; domain?: string | null; identifier?: string | null; kind?: string },
): boolean {
  const candidates = [detection.url, detection.domain, detection.identifier]
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
  if (candidates.length === 0) return false;
  const patterns = [
    rule.domain,
    rule.identifier,
    ...(rule.scriptUrlPatterns ?? []),
    ...(rule.iframeUrlPatterns ?? []),
    ...(rule.pixelUrlPatterns ?? []),
  ].filter(Boolean) as string[];
  return candidates.some((candidate) =>
    patterns.some((pattern) => patternMatches(candidate, pattern)),
  );
}

export function findMatchingTracker<T extends TrackerPatternFields>(
  rules: T[],
  detection: { url?: string | null; domain?: string | null; identifier?: string | null; kind?: string },
): T | null {
  return rules.find((rule) => trackerMatchesDetection(rule, detection)) ?? null;
}

export function isMappedTracker(state: Pick<TrackerMappingState, "purposeId" | "vendorId">): boolean {
  return Boolean(state.purposeId || state.vendorId);
}

export function resolveScannerClassification(
  state: Pick<TrackerMappingState, "purposeId" | "vendorId" | "scannerClassification">,
): ScannerClassification {
  if (state.scannerClassification === "ignored" && !isMappedTracker(state)) return "ignored";
  return isMappedTracker(state) ? "mapped" : "unmapped";
}

export function isUnmappedForReview(state: TrackerMappingState): boolean {
  return (
    state.status !== "archived" &&
    state.scannerClassification !== "ignored" &&
    !isMappedTracker(state) &&
    !state.isEssential
  );
}

export function nextTrackerStatus(
  current: string,
  action: "enable" | "disable" | "archive",
): TrackerStatus {
  if (action === "archive") return "archived";
  if (action === "disable") return "disabled";
  return current === "archived" ? "active" : "active";
}

export function essentialChangeRequiresConfirmation(
  nextEssential: boolean,
  confirmed: boolean,
): boolean {
  return nextEssential === true && confirmed !== true;
}

export function deriveTrackerIdentifier(input: {
  identifier?: string | null;
  domain?: string | null;
  name: string;
}): string {
  const explicit = String(input.identifier ?? "").trim();
  if (explicit) return explicit.slice(0, 500);
  if (input.domain) return String(input.domain).trim().slice(0, 500);
  return `manual:${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80)}`;
}

export function publishedPolicyImpact(input: {
  hasPublishedPolicy: boolean;
  purposeAttachedToPublishedPolicy: boolean;
  mappingChanged: boolean;
}): { affectsPublishedPolicy: boolean; requiresNewDraft: boolean; message: string | null } {
  const affects =
    input.hasPublishedPolicy &&
    input.mappingChanged &&
    input.purposeAttachedToPublishedPolicy;
  return {
    affectsPublishedPolicy: affects,
    requiresNewDraft: affects,
    message: affects
      ? "This change affects published policy configuration. Historical consent evidence is not rewritten. Create a new policy version if the public notice must describe the updated tracker."
      : null,
  };
}

export function auditActionsForChange(
  previous: TrackerMappingState | null,
  next: TrackerMappingState,
  created = false,
): string[] {
  if (created) return [TRACKER_AUDIT_ACTIONS.created];
  if (!previous) return [TRACKER_AUDIT_ACTIONS.updated];
  const actions = new Set<string>([TRACKER_AUDIT_ACTIONS.updated]);
  if (previous.status !== "disabled" && next.status === "disabled") {
    actions.add(TRACKER_AUDIT_ACTIONS.disabled);
  }
  if (previous.status !== "archived" && next.status === "archived") {
    actions.add(TRACKER_AUDIT_ACTIONS.archived);
  }
  if (previous.purposeId !== next.purposeId) {
    actions.add(TRACKER_AUDIT_ACTIONS.purposeChanged);
  }
  if (previous.vendorId !== next.vendorId) {
    actions.add(TRACKER_AUDIT_ACTIONS.vendorChanged);
  }
  if (previous.isEssential !== next.isEssential) {
    actions.add(TRACKER_AUDIT_ACTIONS.essentialChanged);
  }
  const wasMapped = isMappedTracker(previous);
  const nowMapped = isMappedTracker(next);
  if (!wasMapped && nowMapped) actions.add(TRACKER_AUDIT_ACTIONS.mapped);
  if (wasMapped && !nowMapped) actions.add(TRACKER_AUDIT_ACTIONS.unmapped);
  return [...actions];
}

export function sanitizeTrackerAuditConfig(config: Partial<TrackerConfigSnapshot>): Record<string, unknown> {
  return {
    name: config.name ?? null,
    type: config.type ?? null,
    purposeId: config.purposeId ?? null,
    vendorId: config.vendorId ?? null,
    category: config.category ?? null,
    isEssential: config.isEssential === true,
    status: config.status ?? null,
    scannerClassification: config.scannerClassification ?? null,
    domain: config.domain ?? null,
    identifier: config.identifier ?? null,
    party: config.party ?? null,
    cookieNames: config.cookieNames ?? [],
    storageTypes: config.storageTypes ?? [],
    scriptUrlPatterns: config.scriptUrlPatterns ?? [],
    iframeUrlPatterns: config.iframeUrlPatterns ?? [],
    pixelUrlPatterns: config.pixelUrlPatterns ?? [],
  };
}

export function toSdkTrackerRule(tracker: {
  id: string;
  name: string;
  type: string;
  domain: string | null;
  identifier: string | null;
  purposeId: string | null;
  purposeKey?: string | null;
  vendorId: string | null;
  isEssential: boolean;
  status: string;
  category?: string | null;
  cookieNames?: string[];
  storageTypes?: string[];
  localStorageKeys?: string[];
  sessionStorageKeys?: string[];
  indexedDbNames?: string[];
  scriptUrlPatterns?: string[];
  iframeUrlPatterns?: string[];
  pixelUrlPatterns?: string[];
  party?: string | null;
  duration?: string | null;
  deletionBehavior?: string | null;
}) {
  return {
    id: tracker.id,
    name: tracker.name,
    type: tracker.type,
    domain: tracker.domain,
    identifier: tracker.identifier,
    purposeKey: tracker.purposeKey ?? null,
    purposeId: tracker.purposeId,
    vendorId: tracker.vendorId,
    isEssential: tracker.isEssential,
    status: tracker.status,
    category: tracker.category ?? null,
    cookieNames: tracker.cookieNames ?? [],
    storageTypes: tracker.storageTypes ?? [],
    localStorageKeys: tracker.localStorageKeys ?? [],
    sessionStorageKeys: tracker.sessionStorageKeys ?? [],
    indexedDbNames: tracker.indexedDbNames ?? [],
    scriptUrlPatterns: tracker.scriptUrlPatterns ?? [],
    iframeUrlPatterns: tracker.iframeUrlPatterns ?? [],
    pixelUrlPatterns: tracker.pixelUrlPatterns ?? [],
    party: tracker.party ?? "unknown",
    duration: tracker.duration ?? null,
    deletionBehavior: tracker.deletionBehavior ?? null,
  };
}

export type TrackerWriteInput = {
  websiteId: string;
  name: string;
  description: string | null;
  type: TrackerType;
  vendorId: string | null;
  purposeId: string | null;
  category: string | null;
  isEssential: boolean;
  status: TrackerStatus;
  domain: string | null;
  identifier: string;
  scriptUrlPatterns: string[];
  iframeUrlPatterns: string[];
  pixelUrlPatterns: string[];
  cookieNames: string[];
  storageTypes: string[];
  localStorageKeys: string[];
  sessionStorageKeys: string[];
  indexedDbNames: string[];
  party: TrackerParty;
  duration: string | null;
  deletionBehavior: string | null;
  ccpaSale?: CcpaApplicability;
  ccpaShare?: CcpaApplicability;
  ccpaSensitivePi?: CcpaApplicability;
  confirmEssential: boolean;
};

export function parseTrackerWriteInput(
  body: Record<string, unknown>,
  options: { requireWebsite?: boolean } = {},
): { ok: true; value: Partial<TrackerWriteInput> } | { ok: false; message: string } {
  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  if (name !== undefined && !name) return { ok: false, message: "Tracker name is required." };
  if (options.requireWebsite && !isUuid(body.websiteId)) {
    return { ok: false, message: "A valid website is required." };
  }
  if (body.vendorId !== undefined && body.vendorId !== null && body.vendorId !== "" && !isUuid(body.vendorId)) {
    return { ok: false, message: "Vendor must come from the vendor registry." };
  }
  if (body.purposeId !== undefined && body.purposeId !== null && body.purposeId !== "" && !isUuid(body.purposeId)) {
    return { ok: false, message: "Purpose must come from the purpose registry." };
  }
  if (name !== undefined && name.length > 255) {
    return { ok: false, message: "Tracker name is too long." };
  }
  const type = body.type === undefined ? undefined : String(body.type);
  if (type && !TRACKER_TYPES.includes(type as TrackerType)) {
    return { ok: false, message: "Invalid tracker type." };
  }
  const status = body.status === undefined
    ? body.enabled === false
      ? "disabled"
      : body.enabled === true
        ? "active"
        : undefined
    : String(body.status);
  if (status && !TRACKER_STATUSES.includes(status as TrackerStatus)) {
    return { ok: false, message: "Invalid tracker status." };
  }
  const party = body.party === undefined ? undefined : String(body.party);
  if (party && !TRACKER_PARTIES.includes(party as TrackerParty)) {
    return { ok: false, message: "Invalid first-party / third-party value." };
  }
  const scriptUrlPatterns = body.scriptUrlPatterns === undefined && body.scriptPatterns === undefined
    ? undefined
    : parseStringList(body.scriptUrlPatterns ?? body.scriptPatterns);
  const iframeUrlPatterns = body.iframeUrlPatterns === undefined && body.iframePatterns === undefined
    ? undefined
    : parseStringList(body.iframeUrlPatterns ?? body.iframePatterns);
  const pixelUrlPatterns = body.pixelUrlPatterns === undefined && body.pixelPatterns === undefined
    ? undefined
    : parseStringList(body.pixelUrlPatterns ?? body.pixelPatterns);
  const cookieNames = body.cookieNames === undefined ? undefined : parseStringList(body.cookieNames);
  const storageTypes = body.storageTypes === undefined
    ? undefined
    : parseStringList(body.storageTypes).map((item) => item);
  if (storageTypes?.some((item) => !STORAGE_TYPES.includes(item as (typeof STORAGE_TYPES)[number]))) {
    return { ok: false, message: "Invalid storage type." };
  }
  for (const [label, patterns] of [
    ["script URL pattern", scriptUrlPatterns],
    ["iframe URL pattern", iframeUrlPatterns],
    ["pixel URL pattern", pixelUrlPatterns],
    ["cookie name", cookieNames],
    ["storage key", body.storageKeys === undefined ? undefined : parseStringList(body.storageKeys)],
  ] as const) {
    if (!patterns) continue;
    const error = validatePatternList(patterns);
    if (error) return { ok: false, message: `${label}: ${error}` };
  }
  const storageKeys = body.storageKeys === undefined ? undefined : parseStringList(body.storageKeys);
  return {
    ok: true,
    value: {
      websiteId: isUuid(body.websiteId) ? body.websiteId : undefined,
      name,
      description: body.description === undefined
        ? undefined
        : String(body.description).trim() || null,
      type: type as TrackerType | undefined,
      vendorId: body.vendorId === null || body.vendorId === ""
        ? null
        : body.vendorId === undefined
          ? undefined
          : isUuid(body.vendorId)
            ? body.vendorId
            : undefined,
      purposeId: body.purposeId === null || body.purposeId === ""
        ? null
        : body.purposeId === undefined
          ? undefined
          : isUuid(body.purposeId)
            ? body.purposeId
            : undefined,
      category: body.category === undefined ? undefined : String(body.category).trim().slice(0, 100) || null,
      isEssential: body.isEssential === undefined ? undefined : body.isEssential === true,
      status: status as TrackerStatus | undefined,
      domain: body.domain === undefined ? undefined : String(body.domain).trim().slice(0, 255) || null,
      identifier: body.identifier === undefined
        ? undefined
        : String(body.identifier).trim().slice(0, 500) || undefined,
      scriptUrlPatterns,
      iframeUrlPatterns,
      pixelUrlPatterns,
      cookieNames,
      storageTypes,
      localStorageKeys: storageKeys && (storageTypes ?? []).includes("localStorage")
        ? storageKeys
        : body.localStorageKeys === undefined
          ? storageKeys
          : parseStringList(body.localStorageKeys),
      sessionStorageKeys: body.sessionStorageKeys === undefined
        ? storageKeys && (storageTypes ?? []).includes("sessionStorage")
          ? storageKeys
          : storageKeys
        : parseStringList(body.sessionStorageKeys),
      indexedDbNames: body.indexedDbNames === undefined ? undefined : parseStringList(body.indexedDbNames),
      party: party as TrackerParty | undefined,
      duration: body.duration === undefined ? undefined : String(body.duration).trim().slice(0, 255) || null,
      deletionBehavior: body.deletionBehavior === undefined
        ? undefined
        : String(body.deletionBehavior).trim() || null,
      ccpaSale: body.ccpaSale === undefined ? undefined : parseCcpaApplicability(body.ccpaSale),
      ccpaShare: body.ccpaShare === undefined ? undefined : parseCcpaApplicability(body.ccpaShare),
      ccpaSensitivePi: body.ccpaSensitivePi === undefined ? undefined : parseCcpaApplicability(body.ccpaSensitivePi),
      confirmEssential: body.confirmEssential === true,
    },
  };
}

export function detectionMatchStatus(input: {
  matchedTracker: { name: string; purposeName?: string | null; vendorName?: string | null; purposeId: string | null; vendorId: string | null } | null;
}): {
  status: "configured" | "unmapped";
  matchedTracker: string | null;
  purpose: string | null;
  vendor: string | null;
  recommendedAction: string | null;
} {
  if (input.matchedTracker && (input.matchedTracker.purposeId || input.matchedTracker.vendorId)) {
    return {
      status: "configured",
      matchedTracker: input.matchedTracker.name,
      purpose: input.matchedTracker.purposeName ?? null,
      vendor: input.matchedTracker.vendorName ?? null,
      recommendedAction: null,
    };
  }
  return {
    status: "unmapped",
    matchedTracker: input.matchedTracker?.name ?? null,
    purpose: input.matchedTracker?.purposeName ?? null,
    vendor: input.matchedTracker?.vendorName ?? null,
    recommendedAction: "Assign vendor + purpose + classification",
  };
}
