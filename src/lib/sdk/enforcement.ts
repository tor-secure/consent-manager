// ---------------------------------------------------------------------------
// CMP Enforcement types and pure helper functions.
// Importable from both server (dashboard pages) and client components.
// No "server-only" guard — these are pure functions with no DB access.
// ---------------------------------------------------------------------------

// A TrackerRule describes one tracker's blocking requirements.
// Stored in the SDK config payload so the browser can enforce without extra
// round-trips.
export type TrackerType =
  | "cookie"
  | "pixel"
  | "script"
  | "iframe"
  | "beacon"
  | "fingerprint"
  | "storage"
  | "other";

export type TrackerRule = {
  id: string;
  name: string;
  type: TrackerType;
  // Domain pattern to match (e.g. "google-analytics.com"). Null = match by
  // identifier only.
  domain: string | null;
  // Script src / cookie name / storage key to match. Null = match by domain.
  identifier: string | null;
  // The purposeKey whose consent is required (e.g. "analytics").
  // Null = no purpose required (unclassified).
  purposeKey: string | null;
  // purposeId (UUID) for direct grant lookup.
  purposeId: string | null;
  // vendorId (UUID) for vendor-level grant lookup.
  vendorId: string | null;
  // Essential trackers are allowed regardless of consent state unless the
  // operator explicitly classified them as California sale/share/sensitive.
  isEssential: boolean;
  // Whether this tracker is currently active / should be enforced.
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
  party?: "first-party" | "third-party" | "unknown";
  duration?: string | null;
  deletionBehavior?: string | null;
  ccpaSale?: "unknown" | "applicable" | "not_applicable" | null;
  ccpaShare?: "unknown" | "applicable" | "not_applicable" | null;
  ccpaSensitivePi?: "unknown" | "applicable" | "not_applicable" | null;
};

// The per-purpose / per-vendor grant map provided by the consent engine.
export type ConsentGrants = {
  // purposeId → granted
  purposes: Record<string, boolean>;
  // vendorId → granted
  vendors: Record<string, boolean>;
  childRestrictedPurposeIds?: string[];
  california?: {
    applicable: boolean;
    saleOptOut: boolean;
    shareOptOut: boolean;
    sensitivePiLimit: boolean;
    state?: string;
    source?: string;
    gpcActive?: boolean;
  };
};

// ---------------------------------------------------------------------------
// shouldBlock
// Returns true when a tracker should be blocked given the current grants.
// Essential trackers are allowed unless a California classification restricts them.
// A tracker with no purpose/vendor mapping is blocked by default (deny-by-default).
// ---------------------------------------------------------------------------

function californiaBlocks(
  rule: TrackerRule,
  california: ConsentGrants["california"],
): boolean {
  if (!california?.applicable) return false;
  if (california.saleOptOut && rule.ccpaSale === "applicable") return true;
  if (california.shareOptOut && rule.ccpaShare === "applicable") return true;
  if (california.sensitivePiLimit && rule.ccpaSensitivePi === "applicable") return true;
  return false;
}

export function shouldBlock(rule: TrackerRule, grants: ConsentGrants): boolean {
  // Inactive / deleted trackers — don't block (they shouldn't appear anyway).
  if (rule.status !== "active") return false;

  if (californiaBlocks(rule, grants.california)) return true;

  // Essential trackers are always allowed unless California classification restricts them.
  if (rule.isEssential) return false;

  if (rule.purposeId && (grants.childRestrictedPurposeIds ?? []).includes(rule.purposeId)) {
    return true;
  }

  // If the tracker has a purpose, check purpose consent.
  if (rule.purposeId !== null) {
    const purposeGranted = grants.purposes[rule.purposeId] === true;
    if (!purposeGranted) return true;
  }

  // If the tracker has a vendor, check vendor consent in addition.
  if (rule.vendorId !== null) {
    const vendorGranted = grants.vendors[rule.vendorId] === true;
    if (!vendorGranted) return true;
  }

  // No purpose and no vendor — unclassified tracker — block by default.
  if (rule.purposeId === null && rule.vendorId === null) return true;

  // All required consents are granted.
  return false;
}

// ---------------------------------------------------------------------------
// buildBlocklist
// Given a list of tracker rules and the current consent grants, returns the
// subset that should be blocked — as domain and identifier sets for fast
// lookup by the browser enforcement layer.
// ---------------------------------------------------------------------------

export type Blocklist = {
  // Lowercase domain strings to block.
  domains: Set<string>;
  // Exact identifiers (script src substrings / cookie names / storage keys).
  identifiers: Set<string>;
  // The full TrackerRule objects that are blocked (for UI display).
  blocked: TrackerRule[];
  // The TrackerRule objects that are allowed.
  allowed: TrackerRule[];
};

export function buildBlocklist(
  rules: TrackerRule[],
  grants: ConsentGrants,
): Blocklist {
  const blocked: TrackerRule[] = [];
  const allowed: TrackerRule[] = [];
  const domains = new Set<string>();
  const identifiers = new Set<string>();

  for (const rule of rules) {
    if (shouldBlock(rule, grants)) {
      blocked.push(rule);
      if (rule.domain) domains.add(rule.domain.toLowerCase());
      if (rule.identifier) identifiers.add(rule.identifier);
    } else {
      allowed.push(rule);
    }
  }

  return { domains, identifiers, blocked, allowed };
}

// ---------------------------------------------------------------------------
// categoriseTrackers
// Groups tracker rules by their enforcement state for dashboard display.
// ---------------------------------------------------------------------------

export type TrackerCategory = {
  essential: TrackerRule[];
  consentRequired: TrackerRule[];  // non-essential, has purpose/vendor
  unclassified: TrackerRule[];     // no purpose, no vendor — always blocked
};

export function categoriseTrackers(rules: TrackerRule[]): TrackerCategory {
  const result: TrackerCategory = {
    essential: [],
    consentRequired: [],
    unclassified: [],
  };

  for (const rule of rules) {
    if (rule.isEssential) {
      result.essential.push(rule);
    } else if (rule.purposeId !== null || rule.vendorId !== null) {
      result.consentRequired.push(rule);
    } else {
      result.unclassified.push(rule);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// domainMatches
// Returns true if the given URL string contains the blocked domain.
// ---------------------------------------------------------------------------

export function domainMatches(url: string, blockedDomain: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const domain = blockedDomain.toLowerCase();
    return hostname === domain || hostname.endsWith(`.${domain}`);
  } catch {
    // Not a valid URL — check as substring.
    return url.toLowerCase().includes(blockedDomain.toLowerCase());
  }
}

export function requestMatchesTracker(
  url: string,
  rule: TrackerRule,
  kind: "script" | "iframe" | "pixel" | "beacon" | "fetch" = "fetch",
): boolean {
  if (rule.status !== "active") return false;
  if (rule.domain && domainMatches(url, rule.domain)) return true;
  if (rule.identifier && url.toLowerCase().includes(rule.identifier.toLowerCase())) return true;
  const patterns = [
    ...(rule.scriptUrlPatterns ?? []),
    ...(kind === "iframe" ? (rule.iframeUrlPatterns ?? []) : []),
    ...(kind === "pixel" || kind === "beacon" || kind === "fetch"
      ? (rule.pixelUrlPatterns ?? [])
      : []),
  ];
  return patterns.some((pattern) => url.toLowerCase().includes(pattern.toLowerCase()));
}

export function firewallDecisionReason(rule: TrackerRule, grants: ConsentGrants): string {
  if (californiaBlocks(rule, grants.california)) {
    return "california_opt_out";
  }
  if (rule.isEssential) return "essential_allowed";
  if (rule.purposeId && (grants.childRestrictedPurposeIds ?? []).includes(rule.purposeId)) {
    return "child_restricted_purpose";
  }
  if (rule.purposeId && grants.purposes[rule.purposeId] !== true) {
    return `purpose_denied:${rule.purposeKey ?? rule.purposeId}`;
  }
  if (rule.vendorId && grants.vendors[rule.vendorId] !== true) {
    return `vendor_denied:${rule.vendorId}`;
  }
  if (!rule.purposeId && !rule.vendorId) return "unclassified_fail_closed";
  return "consent_granted";
}

// ---------------------------------------------------------------------------
// buildGrantsFromDecisions
// Converts the flat decisions array from /api/consent/record into ConsentGrants.
// ---------------------------------------------------------------------------

export function buildGrantsFromDecisions(
  decisions: Array<{ purposeId: string | null; vendorId: string | null; granted: boolean }>,
): ConsentGrants {
  const grants: ConsentGrants = { purposes: {}, vendors: {} };
  for (const d of decisions) {
    if (d.purposeId) grants.purposes[d.purposeId] = d.granted;
    if (d.vendorId) grants.vendors[d.vendorId] = d.granted;
  }
  return grants;
}
