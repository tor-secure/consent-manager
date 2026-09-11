"use client";

import { useCallback, useState } from "react";

import Link from "next/link";
import { PolicyCompliancePanel, type PolicyValidationResult } from "./policy-compliance-panel";
import { PublishPolicyButton } from "./publish-policy-button";
import type { SetupCheck } from "./policy-setup-checklist";

export function PolicyPublishSection({
  policyId,
  websiteId,
  latestVersionId,
  latestVersionNumber,
  isPublished,
  publishedAt,
  hasPurposes,
  blockers = [],
}: {
  policyId: string;
  websiteId?: string | null;
  latestVersionId: string | null;
  latestVersionNumber: number | null;
  isPublished: boolean;
  publishedAt: Date | null;
  hasPurposes: boolean;
  blockers?: SetupCheck[];
}) {
  const [result, setResult] = useState<PolicyValidationResult | null>(null);
  const onResult = useCallback((next: PolicyValidationResult | null) => {
    setResult(next);
  }, []);

  const openBlockers = blockers.filter((item) => !item.done);

  return (
    <div className="space-y-4">
      {openBlockers.length > 0 ? (
        <ol className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Fix these before publish
          </p>
          {openBlockers.map((item, index) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-start gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm hover:bg-[var(--hover)]"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-[11px] font-semibold text-[var(--muted-foreground)]">
                  {index + 1}
                </span>
                <span>
                  <span className="block font-medium text-[var(--foreground)]">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">{item.hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : null}
      <PolicyCompliancePanel key={policyId} policyId={policyId} websiteId={websiteId} onResult={onResult} />
      <PublishPolicyButton
        policyId={policyId}
        latestVersionId={latestVersionId}
        latestVersionNumber={latestVersionNumber}
        isPublished={isPublished}
        publishedAt={publishedAt}
        hasPurposes={hasPurposes}
        complianceBlocked={Boolean(result && !result.valid)}
        validation={result}
        websiteId={websiteId}
      />
    </div>
  );
}
