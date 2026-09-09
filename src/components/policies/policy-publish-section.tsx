"use client";

import { useCallback, useState } from "react";

import { PolicyCompliancePanel, type PolicyValidationResult } from "./policy-compliance-panel";
import { PublishPolicyButton } from "./publish-policy-button";

export function PolicyPublishSection({
  policyId,
  latestVersionId,
  latestVersionNumber,
  isPublished,
  publishedAt,
  hasPurposes,
}: {
  policyId: string;
  latestVersionId: string | null;
  latestVersionNumber: number | null;
  isPublished: boolean;
  publishedAt: Date | null;
  hasPurposes: boolean;
}) {
  const [result, setResult] = useState<PolicyValidationResult | null>(null);
  const onResult = useCallback((next: PolicyValidationResult | null) => {
    setResult(next);
  }, []);

  return (
    <div className="space-y-4">
      <PolicyCompliancePanel key={policyId} policyId={policyId} onResult={onResult} />
      <PublishPolicyButton
        policyId={policyId}
        latestVersionId={latestVersionId}
        latestVersionNumber={latestVersionNumber}
        isPublished={isPublished}
        publishedAt={publishedAt}
        hasPurposes={hasPurposes}
        complianceBlocked={Boolean(result && !result.valid)}
        validation={result}
      />
    </div>
  );
}
