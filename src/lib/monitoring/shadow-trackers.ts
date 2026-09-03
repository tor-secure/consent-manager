import {
  fingerprintFinding,
  isFirstPartyDomain,
  itemKey,
  severityForFinding,
  type CmpSnapshot,
  type DetectedFinding,
  type FindingDetails,
  type ScanItemSnapshot,
  type TrackerSnapshot,
} from "./drift-engine";

export const EVIDENCE_CONFIRMED_EXECUTION = "confirmed_execution" as const;
export const EVIDENCE_SUSPECTED_EXECUTION = "suspected_execution" as const;
export const EVIDENCE_CONFIGURATION_MISMATCH = "configuration_mismatch" as const;

function trackerForItem(cmp: CmpSnapshot, identifier: string): TrackerSnapshot | null {
  return (
    cmp.trackers.find((tracker) => (tracker.identifier ?? "").trim().toLowerCase() === identifier) ??
    null
  );
}

function purposeKey(cmp: CmpSnapshot, purposeId: string | null): string | null {
  if (!purposeId) return null;
  return cmp.purposes.find((purpose) => purpose.id === purposeId)?.key ?? null;
}

function gatedWithPurpose(item: ScanItemSnapshot, expectedKey: string | null): boolean {
  if (!expectedKey) return false;
  if (item.wouldExecuteOnParse) return false;
  const marked = (item.cmpPurposeValue ?? "").trim().toLowerCase();
  return marked === expectedKey.trim().toLowerCase();
}

export function detectShadowTrackers(input: {
  latest: ScanItemSnapshot[];
  cmp: CmpSnapshot;
  scanId?: string | null;
}): DetectedFinding[] {
  const findings: DetectedFinding[] = [];
  const seen = new Set<string>();

  for (const item of input.latest) {
    const key = itemKey(item);
    if (!key) continue;
    if (isFirstPartyDomain(item.domain, input.cmp.websiteDomain)) continue;

    const tracker = trackerForItem(input.cmp, key);
    if (!tracker || tracker.status !== "active") continue;
    if (tracker.isEssential) continue;
    if (item.type === "cookie" || item.resourceKind === "cookie") continue;

    const expectedPurpose = purposeKey(input.cmp, tracker.purposeId);
    const requiresConsent = Boolean(tracker.purposeId || tracker.vendorId);
    if (!requiresConsent) continue;

    if (gatedWithPurpose(item, expectedPurpose)) continue;

    const ungated = item.wouldExecuteOnParse === true;
    const findingType = ungated ? "shadow_ungated_script" : "shadow_no_cmp_marker";
    const evidenceClass = ungated
      ? EVIDENCE_SUSPECTED_EXECUTION
      : EVIDENCE_CONFIGURATION_MISMATCH;

    const details: FindingDetails = {
      subjectKey: key,
      scanId: input.scanId ?? null,
      pageUrl: item.pageUrl ?? null,
      evidenceSource: "static_html",
      evidenceClass,
      expectedState: {
        consentRequired: true,
        purposeKey: expectedPurpose,
        enforcement: ungated
          ? "Script should not execute on HTML parse until consent is granted"
          : "Resource should carry data-cmp-purpose matching the mapped purpose key",
      },
      observedState: {
        wouldExecuteOnParse: item.wouldExecuteOnParse ?? false,
        cmpPurposeValue: item.cmpPurposeValue ?? null,
        resourceKind: item.resourceKind ?? item.type,
        pageUrl: item.pageUrl ?? null,
      },
      previousState: {
        expected: "gated or marked for CMP enforcement",
      },
      currentState: {
        htmlWouldExecuteOnParse: item.wouldExecuteOnParse ?? false,
        dataCmpPurpose: item.cmpPurposeValue ?? null,
      },
      whatChanged: ungated
        ? `"${item.name}" is present as a loadable HTML resource that the server-side scanner infers would execute or fetch on page parse, while CMP configuration requires purpose/vendor consent.`
        : `"${item.name}" is consent-mapped but the scanned HTML does not include a matching data-cmp-purpose marker.`,
      whyItMatters:
        "This is inferred from static HTML, not from a browser network log. Visitors may load the resource before the SDK can apply consent if the tag is not on the CMP enforcement path.",
      whatIsAffected: `${input.cmp.websiteName} ${item.pageUrl ? `(${item.pageUrl})` : ""}`.trim(),
      recommendedAction: ungated
        ? "Serve the tag as type=\"text/plain\" with data-cmp-purpose set to the mapped purpose key so the CMP SDK can enable it only after consent."
        : "Add data-cmp-purpose matching the tracker purpose key, or remap the tracker if this resource should not be consent-gated.",
    };

    const fingerprint = fingerprintFinding({
      organizationId: input.cmp.organizationId,
      websiteId: input.cmp.websiteId,
      findingType,
      subjectKey: key,
    });
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);

    findings.push({
      findingType,
      severity: severityForFinding({
        findingType,
        type: item.type,
        riskLevel: item.riskLevel,
      }),
      fingerprint,
      subjectKey: key,
      trackerId: tracker.id,
      vendorId: tracker.vendorId,
      purposeId: tracker.purposeId,
      title: ungated
        ? `Suspected ungated tracker: ${item.name}`
        : `CMP marker missing: ${item.name}`,
      details,
    });
  }

  return findings;
}
