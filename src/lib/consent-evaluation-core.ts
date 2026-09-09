import "server-only";

export const CONSENT_EVALUATION_REASON_CODES = [
  "GRANTED",
  "ESSENTIAL_PURPOSE",
  "ESSENTIAL_TRACKER",
  "CONSENT_WITHDRAWN",
  "CONSENT_EXPIRED",
  "CONSENT_INACTIVE",
  "NOT_GRANTED",
  "UNKNOWN_PURPOSE",
  "UNKNOWN_VENDOR",
  "UNKNOWN_TRACKER",
  "UNKNOWN_DATA_CATEGORY",
  "UNCLASSIFIED_TRACKER",
  "CHILD_RESTRICTED",
] as const;

export type ConsentEvaluationReasonCode =
  (typeof CONSENT_EVALUATION_REASON_CODES)[number];
export type ConsentState = "active" | "expired" | "withdrawn" | "inactive";

export type ConsentEvaluationRequest = {
  purposeKeys: string[];
  vendorDomains: string[];
  trackerIds: string[];
  dataCategories: string[];
};

export type ConsentEvaluationSnapshot = {
  record: {
    status: string;
    expiresAt: Date | null;
    withdrawnAt: Date | null;
  };
  decisions: Array<{
    purposeId: string | null;
    vendorId: string | null;
    granted: boolean;
  }>;
  purposes: Array<{
    id: string;
    key: string;
    isRequired: boolean;
    status: string;
    dataCategories: string[] | null;
  }>;
  vendors: Array<{
    id: string;
    domain: string | null;
    status: string;
  }>;
  trackers: Array<{
    id: string;
    purposeId: string | null;
    vendorId: string | null;
    isEssential: boolean;
    status: string;
  }>;
  childProtection?: {
    restrictedPurposeKeys: string[];
    allowRestricted: boolean;
  };
};

export type ConsentEvaluationItem = {
  requested: string;
  allowed: boolean;
  reasonCode: ConsentEvaluationReasonCode;
};

export type ConsentEvaluationResult = {
  allowed: boolean;
  reasonCode: "ALL_REQUESTS_ALLOWED" | "ONE_OR_MORE_REQUESTS_DENIED";
  consentState: ConsentState;
  results: {
    purposes: ConsentEvaluationItem[];
    vendors: ConsentEvaluationItem[];
    trackers: ConsentEvaluationItem[];
    dataCategories: ConsentEvaluationItem[];
  };
};

function normalized(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveConsentState(
  record: ConsentEvaluationSnapshot["record"],
  now = new Date(),
): ConsentState {
  if (record.status === "withdrawn" || record.withdrawnAt) return "withdrawn";
  if (record.expiresAt && record.expiresAt.getTime() <= now.getTime()) return "expired";
  if (["accepted", "partial", "rejected", "active"].includes(record.status)) return "active";
  return "inactive";
}

function stateDenialReason(state: ConsentState): ConsentEvaluationReasonCode | null {
  if (state === "withdrawn") return "CONSENT_WITHDRAWN";
  if (state === "expired") return "CONSENT_EXPIRED";
  if (state === "inactive") return "CONSENT_INACTIVE";
  return null;
}

export function evaluateConsentSnapshot(
  request: ConsentEvaluationRequest,
  snapshot: ConsentEvaluationSnapshot,
  now = new Date(),
): ConsentEvaluationResult {
  const consentState = resolveConsentState(snapshot.record, now);
  const stateReason = stateDenialReason(consentState);
  const purposeGranted = new Map<string, boolean>();
  const vendorGranted = new Map<string, boolean>();

  for (const decision of snapshot.decisions) {
    if (decision.purposeId) purposeGranted.set(decision.purposeId, decision.granted);
    if (decision.vendorId) vendorGranted.set(decision.vendorId, decision.granted);
  }

  const purposeByKey = new Map(
    snapshot.purposes
      .filter((purpose) => purpose.status === "active")
      .map((purpose) => [normalized(purpose.key), purpose]),
  );
  const vendorByDomain = new Map(
    snapshot.vendors
      .filter((vendor) => vendor.status === "active" && vendor.domain)
      .map((vendor) => [normalized(vendor.domain!), vendor]),
  );
  const trackerById = new Map(
    snapshot.trackers
      .filter((tracker) => tracker.status === "active")
      .map((tracker) => [normalized(tracker.id), tracker]),
  );

  const purposes = request.purposeKeys.map((requested) => {
    const purpose = purposeByKey.get(normalized(requested));
    if (!purpose) return denied(requested, "UNKNOWN_PURPOSE");
    if (purpose.isRequired) return granted(requested, "ESSENTIAL_PURPOSE");
    if (
      snapshot.childProtection &&
      !snapshot.childProtection.allowRestricted &&
      snapshot.childProtection.restrictedPurposeKeys.includes(normalized(purpose.key))
    ) {
      return denied(requested, "CHILD_RESTRICTED");
    }
    if (stateReason) return denied(requested, stateReason);
    return purposeGranted.get(purpose.id) === true
      ? granted(requested, "GRANTED")
      : denied(requested, "NOT_GRANTED");
  });

  const vendors = request.vendorDomains.map((requested) => {
    const vendor = vendorByDomain.get(normalized(requested));
    if (!vendor) return denied(requested, "UNKNOWN_VENDOR");
    if (stateReason) return denied(requested, stateReason);
    return vendorGranted.get(vendor.id) === true
      ? granted(requested, "GRANTED")
      : denied(requested, "NOT_GRANTED");
  });

  const trackers = request.trackerIds.map((requested) => {
    const tracker = trackerById.get(normalized(requested));
    if (!tracker) return denied(requested, "UNKNOWN_TRACKER");
    if (tracker.isEssential) return granted(requested, "ESSENTIAL_TRACKER");
    const trackerPurpose = tracker.purposeId
      ? snapshot.purposes.find((purpose) => purpose.id === tracker.purposeId)
      : null;
    if (
      trackerPurpose &&
      snapshot.childProtection &&
      !snapshot.childProtection.allowRestricted &&
      snapshot.childProtection.restrictedPurposeKeys.includes(normalized(trackerPurpose.key))
    ) {
      return denied(requested, "CHILD_RESTRICTED");
    }
    if (stateReason) return denied(requested, stateReason);
    if (!tracker.purposeId && !tracker.vendorId) {
      return denied(requested, "UNCLASSIFIED_TRACKER");
    }
    const purposeAllowed =
      !tracker.purposeId || purposeGranted.get(tracker.purposeId) === true;
    const vendorAllowed =
      !tracker.vendorId || vendorGranted.get(tracker.vendorId) === true;
    return purposeAllowed && vendorAllowed
      ? granted(requested, "GRANTED")
      : denied(requested, "NOT_GRANTED");
  });

  const dataCategories = request.dataCategories.map((requested) => {
    const category = normalized(requested);
    const matchingPurposes = snapshot.purposes.filter(
      (purpose) =>
        purpose.status === "active" &&
        (purpose.dataCategories ?? []).some((value) => normalized(value) === category),
    );
    if (matchingPurposes.length === 0) {
      return denied(requested, "UNKNOWN_DATA_CATEGORY");
    }
    if (matchingPurposes.some((purpose) => purpose.isRequired)) {
      return granted(requested, "ESSENTIAL_PURPOSE");
    }
    if (stateReason) return denied(requested, stateReason);
    return matchingPurposes.some((purpose) => purposeGranted.get(purpose.id) === true)
      ? granted(requested, "GRANTED")
      : denied(requested, "NOT_GRANTED");
  });

  const allItems = [...purposes, ...vendors, ...trackers, ...dataCategories];
  const allowed = allItems.length > 0 && allItems.every((item) => item.allowed);
  return {
    allowed,
    reasonCode: allowed ? "ALL_REQUESTS_ALLOWED" : "ONE_OR_MORE_REQUESTS_DENIED",
    consentState,
    results: { purposes, vendors, trackers, dataCategories },
  };
}

function granted(
  requested: string,
  reasonCode: ConsentEvaluationReasonCode,
): ConsentEvaluationItem {
  return { requested, allowed: true, reasonCode };
}

function denied(
  requested: string,
  reasonCode: ConsentEvaluationReasonCode,
): ConsentEvaluationItem {
  return { requested, allowed: false, reasonCode };
}
