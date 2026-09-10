"use client";

import { useEffect, useState } from "react";

type Issue = {
  code: string;
  severity: "error" | "warning";
  jurisdiction: string;
  field?: string;
  message: string;
  remediation?: string;
};

export type PolicyValidationResult = {
  valid: boolean;
  validatorVersion: string;
  jurisdictions: string[];
  errors: Issue[];
  warnings: Issue[];
};

function IssueCard({ issue }: { issue: Issue }) {
  const blocked = issue.severity === "error";
  return (
    <li className={`rounded-2xl px-4 py-3 ${blocked ? "bg-rose-50 text-rose-900" : "bg-amber-50 text-amber-900"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide">
        {issue.jurisdiction} · {issue.code}
      </p>
      {issue.field && <p className="mt-0.5 text-[11px] opacity-70">{issue.field}</p>}
      <p className="mt-1 text-sm">{issue.message}</p>
      {issue.remediation && (
        <p className="mt-1 text-xs">
          <span className="font-semibold">Fix: </span>
          {issue.remediation}
        </p>
      )}
    </li>
  );
}

export function PolicyCompliancePanel({
  policyId,
  onResult,
}: {
  policyId: string;
  onResult?: (result: PolicyValidationResult | null) => void;
}) {
  const [result, setResult] = useState<PolicyValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/policies/${policyId}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then(async (res) => {
        let data: {
          success?: boolean;
          message?: string;
          validation?: PolicyValidationResult;
        } = {};
        try {
          data = (await res.json()) as typeof data;
        } catch {
          data = {};
        }
        if (cancelled) return;
        if (!data.success || !data.validation) {
          setError(
            data.message
              ?? (res.status >= 500
                ? "Unable to validate this policy. The database may be unreachable or missing vendor-role columns."
                : "Unable to validate this policy."),
          );
          onResult?.(null);
          return;
        }
        setResult(data.validation);
        onResult?.(data.validation);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to reach the validation API. Confirm the app is running and the database is reachable.");
          onResult?.(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [policyId, onResult]);

  if (loading) {
    return <p className="text-sm text-slate-500">Checking configured compliance rules…</p>;
  }
  if (error) {
    return <p className="text-sm text-rose-700">{error}</p>;
  }
  if (!result) return null;

  return (
    <div className="space-y-3">
      {result.errors.length > 0 ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <p className="font-semibold">Publishing blocked</p>
          <p>
            {result.errors.length} compliance error{result.errors.length === 1 ? "" : "s"} must be fixed
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          No blocking compliance errors. Warnings do not prevent publishing.
        </div>
      )}
      {result.jurisdictions.length > 0 && (
        <p className="text-xs text-slate-500">
          Applicable jurisdictions: {result.jurisdictions.map((key) => key.toUpperCase()).join(", ")}
        </p>
      )}
      {result.errors.length > 0 && (
        <ul className="space-y-2">
          {result.errors.map((item) => (
            <IssueCard key={`${item.code}-${item.field ?? ""}`} issue={item} />
          ))}
        </ul>
      )}
      {result.warnings.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Warnings</p>
          <ul className="space-y-2">
            {result.warnings.map((item) => (
              <IssueCard key={`${item.code}-${item.field ?? ""}`} issue={item} />
            ))}
          </ul>
        </div>
      )}
      <p className="text-[11px] text-slate-400">
        Technical configuration checks only. This is not legal advice or a compliance certification.
      </p>
    </div>
  );
}
