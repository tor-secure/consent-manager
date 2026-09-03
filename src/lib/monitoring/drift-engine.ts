import { createHash } from "node:crypto";

export const FINDING_TYPES = [
  "new_tracker",
  "removed_tracker",
  "vendor_mapping_changed",
  "purpose_mapping_changed",
  "unmapped_tracker",
  "unmapped_vendor",
  "missing_enforcement_rule",
  "enforcement_mismatch",
  "third_party_domain_changed",
  "shadow_ungated_script",
  "shadow_no_cmp_marker",
] as const;

export const SHADOW_FINDING_TYPES = ["shadow_ungated_script", "shadow_no_cmp_marker"] as const;

export type FindingType = (typeof FINDING_TYPES)[number];

export const FINDING_STATUSES = ["open", "reviewed", "resolved"] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];

export const FINDING_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];

export type ScanItemSnapshot = {
  identifier: string;
  name: string;
  type: string;
  domain: string | null;
  riskLevel: string;
  classificationStatus: string;
  pageUrl?: string | null;
  wouldExecuteOnParse?: boolean;
  cmpPurposeValue?: string | null;
  resourceKind?: string;
};

export type TrackerSnapshot = {
  id: string;
  identifier: string | null;
  name: string;
  type: string;
  domain: string | null;
  vendorId: string | null;
  purposeId: string | null;
  isEssential: boolean;
  status: string;
};

export type VendorSnapshot = {
  id: string;
  name: string;
  domain: string | null;
  status: string;
};

export type PurposeSnapshot = {
  id: string;
  name: string;
  key: string;
  isRequired: boolean;
};

export type CmpSnapshot = {
  organizationId: string;
  websiteId: string;
  websiteName: string;
  websiteDomain: string;
  publishedPolicyId: string | null;
  publishedPolicyVersionId: string | null;
  publishedPurposeIds: string[];
  trackers: TrackerSnapshot[];
  vendors: VendorSnapshot[];
  purposes: PurposeSnapshot[];
  vendorPurposeIds: Record<string, string[]>;
  publishedConsentExpireDays?: number | null;
};

export type FindingDetails = {
  whatChanged: string;
  previousState: Record<string, unknown>;
  currentState: Record<string, unknown>;
  whyItMatters: string;
  whatIsAffected: string;
  recommendedAction: string;
  subjectKey: string;
  scanId?: string | null;
  previousScanId?: string | null;
  expectedState?: Record<string, unknown>;
  observedState?: Record<string, unknown>;
  evidenceSource?: "static_html" | "cmp_configuration" | "scan_inventory";
  evidenceClass?: "suspected_execution" | "configuration_mismatch" | "confirmed_execution";
  pageUrl?: string | null;
};

export type DetectedFinding = {
  findingType: FindingType;
  severity: FindingSeverity;
  fingerprint: string;
  subjectKey: string;
  trackerId: string | null;
  vendorId: string | null;
  purposeId: string | null;
  title: string;
  details: FindingDetails;
};

export type StoredFindingRef = {
  fingerprint: string;
  status: FindingStatus;
};

export type FindingUpsertDecision = "create" | "update" | "reopen";

const FINGERPRINT_VERSION = "v1";

export function normalizeHost(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase().replace(/\.$/, "");
  if (!trimmed) return null;
  try {
    if (trimmed.includes("://")) {
      return new URL(trimmed).hostname.toLowerCase().replace(/^www\./, "");
    }
  } catch {
    /* fall through */
  }
  return trimmed.replace(/^www\./, "");
}

export function itemKey(item: { identifier?: string | null; domain?: string | null; name?: string }): string {
  return (item.identifier ?? item.domain ?? item.name ?? "").trim().toLowerCase();
}

export function hostsRelated(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
}

export function isFirstPartyDomain(itemDomain: string | null, websiteDomain: string): boolean {
  const item = normalizeHost(itemDomain);
  const site = normalizeHost(websiteDomain);
  if (!item || !site) return false;
  return hostsRelated(item, site);
}

export function findVendorForDomain(
  vendors: VendorSnapshot[],
  domain: string | null,
): VendorSnapshot | null {
  const host = normalizeHost(domain);
  if (!host) return null;
  const active = vendors.filter((vendor) => vendor.status === "active");
  return active.find((vendor) => hostsRelated(host, normalizeHost(vendor.domain))) ?? null;
}

export function fingerprintFinding(input: {
  organizationId: string;
  websiteId: string;
  findingType: FindingType;
  subjectKey: string;
}): string {
  const material = [
    FINGERPRINT_VERSION,
    input.organizationId,
    input.websiteId,
    input.findingType,
    input.subjectKey.trim().toLowerCase(),
  ].join("|");
  return createHash("sha256").update(material).digest("hex");
}

export function severityForFinding(input: {
  findingType: FindingType;
  type?: string;
  riskLevel?: string;
}): FindingSeverity {
  const risk = (input.riskLevel ?? "").toLowerCase();
  const trackerType = (input.type ?? "").toLowerCase();
  const highRisk = risk === "high" || risk === "critical" || trackerType === "fingerprint";

  switch (input.findingType) {
    case "new_tracker":
      return highRisk ? "critical" : "high";
    case "unmapped_tracker":
    case "missing_enforcement_rule":
      return highRisk ? "critical" : "high";
    case "enforcement_mismatch":
    case "purpose_mapping_changed":
      return highRisk ? "high" : "medium";
    case "vendor_mapping_changed":
    case "unmapped_vendor":
    case "third_party_domain_changed":
      return "medium";
    case "removed_tracker":
      return "low";
    case "shadow_ungated_script":
      return highRisk ? "critical" : "high";
    case "shadow_no_cmp_marker":
      return highRisk ? "high" : "medium";
    default:
      return "medium";
  }
}

export function decideFindingUpsert(existing: StoredFindingRef | null): FindingUpsertDecision {
  if (!existing) return "create";
  if (existing.status === "resolved") return "reopen";
  return "update";
}

export function shouldNotifyForDecision(decision: FindingUpsertDecision): boolean {
  return decision === "create" || decision === "reopen";
}

function trackerByIdentifier(cmp: CmpSnapshot, identifier: string): TrackerSnapshot | null {
  return (
    cmp.trackers.find(
      (tracker) => (tracker.identifier ?? "").trim().toLowerCase() === identifier,
    ) ?? null
  );
}

function purposeById(cmp: CmpSnapshot, id: string | null): PurposeSnapshot | null {
  if (!id) return null;
  return cmp.purposes.find((purpose) => purpose.id === id) ?? null;
}

function vendorById(cmp: CmpSnapshot, id: string | null): VendorSnapshot | null {
  if (!id) return null;
  return cmp.vendors.find((vendor) => vendor.id === id) ?? null;
}

function makeFinding(
  cmp: CmpSnapshot,
  findingType: FindingType,
  subjectKey: string,
  title: string,
  details: Omit<FindingDetails, "subjectKey"> & { subjectKey?: string },
  ids: { trackerId?: string | null; vendorId?: string | null; purposeId?: string | null },
  extras?: { type?: string; riskLevel?: string },
): DetectedFinding {
  const fingerprint = fingerprintFinding({
    organizationId: cmp.organizationId,
    websiteId: cmp.websiteId,
    findingType,
    subjectKey,
  });
  return {
    findingType,
    severity: severityForFinding({
      findingType,
      type: extras?.type,
      riskLevel: extras?.riskLevel,
    }),
    fingerprint,
    subjectKey,
    trackerId: ids.trackerId ?? null,
    vendorId: ids.vendorId ?? null,
    purposeId: ids.purposeId ?? null,
    title,
    details: { ...details, subjectKey },
  };
}

export function detectDrift(input: {
  latest: ScanItemSnapshot[];
  previous: ScanItemSnapshot[] | null;
  cmp: CmpSnapshot;
  scanId?: string | null;
  previousScanId?: string | null;
}): DetectedFinding[] {
  const findings: DetectedFinding[] = [];
  const seen = new Set<string>();

  const push = (finding: DetectedFinding) => {
    if (seen.has(finding.fingerprint)) return;
    seen.add(finding.fingerprint);
    findings.push(finding);
  };

  const latestMap = new Map<string, ScanItemSnapshot>();
  for (const item of input.latest) {
    const key = itemKey(item);
    if (key) latestMap.set(key, item);
  }

  const previousMap = new Map<string, ScanItemSnapshot>();
  if (input.previous) {
    for (const item of input.previous) {
      const key = itemKey(item);
      if (key) previousMap.set(key, item);
    }
  }

  const hasPreviousScan = input.previous !== null;
  const scanMeta = {
    scanId: input.scanId ?? null,
    previousScanId: input.previousScanId ?? null,
  };

  if (hasPreviousScan) {
    for (const [key, current] of latestMap) {
      if (isFirstPartyDomain(current.domain, input.cmp.websiteDomain)) continue;
      if (!previousMap.has(key)) {
        const tracker = trackerByIdentifier(input.cmp, key);
        push(
          makeFinding(
            input.cmp,
            "new_tracker",
            key,
            `New tracker detected: ${current.name}`,
            {
              ...scanMeta,
              whatChanged: `Tracker "${current.name}" appeared in the latest scan and was not present in the previous completed scan.`,
              previousState: { present: false },
              currentState: {
                identifier: current.identifier,
                domain: current.domain,
                type: current.type,
                riskLevel: current.riskLevel,
              },
              whyItMatters:
                "A newly observed third-party tracker may collect data that is not described in the current notice or mapped to a purpose.",
              whatIsAffected: `${input.cmp.websiteName} scanner inventory and consent coverage`,
              recommendedAction:
                "Review the tracker, map it to a vendor and purpose, and confirm the published policy covers it before the next release.",
            },
            { trackerId: tracker?.id ?? null, vendorId: tracker?.vendorId ?? null, purposeId: tracker?.purposeId ?? null },
            { type: current.type, riskLevel: current.riskLevel },
          ),
        );
      }
    }

    for (const [key, previous] of previousMap) {
      if (isFirstPartyDomain(previous.domain, input.cmp.websiteDomain)) continue;
      if (!latestMap.has(key)) {
        const tracker = trackerByIdentifier(input.cmp, key);
        push(
          makeFinding(
            input.cmp,
            "removed_tracker",
            key,
            `Tracker no longer detected: ${previous.name}`,
            {
              ...scanMeta,
              whatChanged: `Tracker "${previous.name}" was present in the previous completed scan and is absent from the latest scan.`,
              previousState: {
                identifier: previous.identifier,
                domain: previous.domain,
                type: previous.type,
              },
              currentState: { present: false },
              whyItMatters:
                "Removed trackers can mean a vendor was dropped, or the scanner could not see a script that still loads on other pages.",
              whatIsAffected: `${input.cmp.websiteName} tracker inventory`,
              recommendedAction:
                "Confirm the vendor was intentionally removed. If it still loads on other pages, map it manually or scan additional URLs.",
            },
            { trackerId: tracker?.id ?? null },
            { type: previous.type, riskLevel: previous.riskLevel },
          ),
        );
      }
    }

    for (const [key, current] of latestMap) {
      const previous = previousMap.get(key);
      if (!previous) continue;
      const prevHost = normalizeHost(previous.domain);
      const curHost = normalizeHost(current.domain);
      if (!prevHost || !curHost || prevHost === curHost) continue;
      if (isFirstPartyDomain(current.domain, input.cmp.websiteDomain)) continue;
      const tracker = trackerByIdentifier(input.cmp, key);
      push(
        makeFinding(
          input.cmp,
          "third_party_domain_changed",
          key,
          `Third-party domain changed for ${current.name}`,
          {
            ...scanMeta,
            whatChanged: `The network host for "${current.name}" changed between scans.`,
            previousState: { domain: previous.domain },
            currentState: { domain: current.domain },
            whyItMatters:
              "A domain change can mean a vendor CDN shift, a new processor, or an incorrect mapping that enforcement will miss.",
            whatIsAffected: `${input.cmp.websiteName} vendor mapping and script blocking`,
            recommendedAction:
              "Verify the new domain belongs to the same vendor. Update the vendor domain and tracker mapping if needed.",
          },
          { trackerId: tracker?.id ?? null, vendorId: tracker?.vendorId ?? null },
          { type: current.type, riskLevel: current.riskLevel },
        ),
      );
    }
  }

  for (const [key, current] of latestMap) {
    if (isFirstPartyDomain(current.domain, input.cmp.websiteDomain)) continue;

    const tracker = trackerByIdentifier(input.cmp, key);
    const catalogVendor = findVendorForDomain(input.cmp.vendors, current.domain);

    if (!tracker || tracker.status !== "active") {
      push(
        makeFinding(
          input.cmp,
          "missing_enforcement_rule",
          key,
          `No active enforcement rule for ${current.name}`,
          {
            ...scanMeta,
            whatChanged: `Latest scan detected "${current.name}" but there is no active tracker rule the CMP can enforce.`,
            previousState: { tracker: tracker ? { id: tracker.id, status: tracker.status } : null },
            currentState: { identifier: current.identifier, domain: current.domain },
            whyItMatters:
              "Without an active tracker rule, the banner and SDK cannot gate this script on purpose consent.",
            whatIsAffected: `${input.cmp.websiteName} enforcement`,
            recommendedAction:
              "Create or reactivate a tracker record, then map a purpose so the SDK can block it until consent is granted.",
          },
          { trackerId: tracker?.id ?? null },
          { type: current.type, riskLevel: current.riskLevel },
        ),
      );
      continue;
    }

    if (!tracker.isEssential && !tracker.vendorId && !tracker.purposeId) {
      push(
        makeFinding(
          input.cmp,
          "unmapped_tracker",
          key,
          `Unmapped tracker: ${tracker.name}`,
          {
            ...scanMeta,
            whatChanged: `"${tracker.name}" is in inventory without a vendor or purpose mapping.`,
            previousState: {},
            currentState: {
              trackerId: tracker.id,
              vendorId: null,
              purposeId: null,
              isEssential: tracker.isEssential,
            },
            whyItMatters:
              "Unmapped, non-essential trackers are treated as unclassified. They are blocked by default and are not explained in the notice.",
            whatIsAffected: `${input.cmp.websiteName} notice completeness and enforcement`,
            recommendedAction: "Map this tracker to a vendor and a processing purpose, or mark it essential if it is strictly necessary.",
          },
          { trackerId: tracker.id },
          { type: tracker.type, riskLevel: current.riskLevel },
        ),
      );
    }

    if (!catalogVendor && current.domain) {
      push(
        makeFinding(
          input.cmp,
          "unmapped_vendor",
          normalizeHost(current.domain) ?? current.domain,
          `Unmapped third-party domain: ${current.domain}`,
          {
            ...scanMeta,
            whatChanged: `Scan observed ${current.domain}, which does not match any active vendor domain in this organization.`,
            previousState: {},
            currentState: { domain: current.domain, tracker: tracker.name },
            whyItMatters:
              "An unknown third party may be processing personal data without appearing in the vendor list shown to visitors.",
            whatIsAffected: `${input.cmp.websiteName} vendor inventory`,
            recommendedAction: "Add a vendor for this domain or confirm it is first-party infrastructure and exclude it from vendor mapping.",
          },
          { trackerId: tracker.id },
          { type: current.type, riskLevel: current.riskLevel },
        ),
      );
    }

    if (tracker.vendorId && catalogVendor && tracker.vendorId !== catalogVendor.id) {
      const mapped = vendorById(input.cmp, tracker.vendorId);
      push(
        makeFinding(
          input.cmp,
          "vendor_mapping_changed",
          key,
          `Vendor mapping does not match domain for ${tracker.name}`,
          {
            ...scanMeta,
            whatChanged: `"${tracker.name}" is mapped to ${mapped?.name ?? tracker.vendorId}, but the observed domain matches ${catalogVendor.name}.`,
            previousState: { vendorId: tracker.vendorId, vendorName: mapped?.name ?? null },
            currentState: { observedVendorId: catalogVendor.id, observedVendorName: catalogVendor.name, domain: current.domain },
            whyItMatters:
              "Vendor-level consent and disclosures can target the wrong company when the domain mapping is inconsistent.",
            whatIsAffected: `${input.cmp.websiteName} vendor consent`,
            recommendedAction: "Update the tracker vendor mapping to the catalog vendor that owns this domain, or correct the vendor domain.",
          },
          { trackerId: tracker.id, vendorId: catalogVendor.id, purposeId: tracker.purposeId },
          { type: tracker.type, riskLevel: current.riskLevel },
        ),
      );
    }

    if (tracker.purposeId && input.cmp.publishedPolicyVersionId) {
      const purpose = purposeById(input.cmp, tracker.purposeId);
      if (!input.cmp.publishedPurposeIds.includes(tracker.purposeId)) {
        push(
          makeFinding(
            input.cmp,
            "purpose_mapping_changed",
            key,
            `Purpose not on published policy: ${tracker.name}`,
            {
              ...scanMeta,
              whatChanged: `"${tracker.name}" is mapped to purpose "${purpose?.name ?? tracker.purposeId}", which is not on the published policy version.`,
              previousState: { purposeId: tracker.purposeId, purposeName: purpose?.name ?? null },
              currentState: {
                publishedPolicyVersionId: input.cmp.publishedPolicyVersionId,
                publishedPurposeIds: input.cmp.publishedPurposeIds,
              },
              whyItMatters:
                "Visitors may not see this purpose in the live notice, so consent collected for the published policy may not cover this tracker.",
              whatIsAffected: `${input.cmp.websiteName} published policy`,
              recommendedAction: "Add the purpose to the published policy version, or remap the tracker to a purpose that is already published.",
            },
            { trackerId: tracker.id, vendorId: tracker.vendorId, purposeId: tracker.purposeId },
            { type: tracker.type, riskLevel: current.riskLevel },
          ),
        );
      }
    }

    if (tracker.vendorId && tracker.purposeId) {
      const allowed = input.cmp.vendorPurposeIds[tracker.vendorId] ?? [];
      if (allowed.length > 0 && !allowed.includes(tracker.purposeId)) {
        const purpose = purposeById(input.cmp, tracker.purposeId);
        const vendor = vendorById(input.cmp, tracker.vendorId);
        push(
          makeFinding(
            input.cmp,
            "enforcement_mismatch",
            key,
            `Vendor/purpose mismatch for ${tracker.name}`,
            {
              ...scanMeta,
              whatChanged: `"${tracker.name}" maps vendor "${vendor?.name ?? tracker.vendorId}" to purpose "${purpose?.name ?? tracker.purposeId}", but that purpose is not linked to the vendor.`,
              previousState: { vendorPurposeIds: allowed },
              currentState: { vendorId: tracker.vendorId, purposeId: tracker.purposeId },
              whyItMatters:
                "SDK vendor grants and purpose grants can disagree, producing enforcement that does not match the configured vendor-purpose relationship.",
              whatIsAffected: `${input.cmp.websiteName} enforcement rules`,
              recommendedAction: "Attach the purpose to the vendor, or change the tracker purpose to one the vendor is allowed to use.",
            },
            { trackerId: tracker.id, vendorId: tracker.vendorId, purposeId: tracker.purposeId },
            { type: tracker.type, riskLevel: current.riskLevel },
          ),
        );
      }
    }

    if (
      !tracker.isEssential &&
      (tracker.purposeId || tracker.vendorId) &&
      !tracker.domain &&
      !tracker.identifier
    ) {
      push(
        makeFinding(
          input.cmp,
          "enforcement_mismatch",
          key,
          `Enforcement rule cannot match ${tracker.name}`,
          {
            ...scanMeta,
            whatChanged: `"${tracker.name}" is consent-controlled but has neither a domain nor an identifier for the SDK to match.`,
            previousState: {},
            currentState: { trackerId: tracker.id, domain: tracker.domain, identifier: tracker.identifier },
            whyItMatters:
              "The SDK blocklist cannot match this tracker on the page, so mapping it to a purpose does not actually gate the script.",
            whatIsAffected: `${input.cmp.websiteName} SDK enforcement`,
            recommendedAction: "Set the tracker domain or identifier to the value observed in scans.",
          },
          { trackerId: tracker.id, vendorId: tracker.vendorId, purposeId: tracker.purposeId },
          { type: tracker.type, riskLevel: current.riskLevel },
        ),
      );
    }
  }

  return findings;
}
