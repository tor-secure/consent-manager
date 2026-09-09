"use client";

import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormCard } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type WebsiteRow = { id: string; name: string };
type EvaluationDetail = { requested?: string; key?: string; domain?: string; allowed: boolean; reason?: string; reasonCode?: string };
type PermissionResult = {
  allowed: boolean;
  reasonCode: string;
  consentState: string;
  requestId: string;
  purposeDetails?: Array<{ key: string; allowed: boolean; reason: string }>;
  vendorDetails?: Array<{ domain: string; allowed: boolean; reason: string }>;
  reasons?: string[];
  results?: { purposes?: EvaluationDetail[]; vendors?: EvaluationDetail[] };
};

export default function AgentPermissionTool({ websites }: { websites: WebsiteRow[] }) {
  const [consentId, setConsentId] = useState("");
  const [websiteId, setWebsiteId] = useState(websites[0]?.id ?? "");

  const [purposeKeys, setPurposeKeys] = useState("");
  const [vendorDomains, setVendorDomains] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PermissionResult | null>(null);

  const purposeKeyList = useMemo(
    () =>
      purposeKeys
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [purposeKeys],
  );
  const vendorDomainList = useMemo(
    () =>
      vendorDomains
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [vendorDomains],
  );

  async function evaluate() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch(`/api/agent/permission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consentId: consentId.trim(),
          websiteId,
          requestedPurposeKeys: purposeKeyList,
          requestedVendorDomains: vendorDomainList,
        }),
      });
      const data = (await r.json()) as PermissionResult & { success?: boolean; message?: string };
      if (!data.success) throw new Error(data.message || "Permission evaluation failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <FormCard
        title="Permission request"
        description="Test the exact purpose and vendor access an agent needs. The evaluator reads the current consent record and does not modify it."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Consent ID" htmlFor="agent-consent-id" hint="Use the public consent_id returned by the CMP.">
            <Input id="agent-consent-id" value={consentId} onChange={(e) => setConsentId(e.target.value)} placeholder="consent_id" autoComplete="off" />
          </Field>
          <Field label="Website" htmlFor="agent-website">
            <Select id="agent-website" value={websiteId} onChange={(e) => setWebsiteId(e.target.value)}>
            {websites.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
            </Select>
          </Field>
          <Field label="Requested purpose keys" htmlFor="agent-purposes" hint="Comma-separated keys, for example analytics, personalization.">
            <Input id="agent-purposes" value={purposeKeys} onChange={(e) => setPurposeKeys(e.target.value)} placeholder="analytics, personalization" />
          </Field>
          <Field label="Requested vendor domains" htmlFor="agent-vendors" hint="Comma-separated domains, for example analytics.example.com.">
            <Input id="agent-vendors" value={vendorDomains} onChange={(e) => setVendorDomains(e.target.value)} placeholder="analytics.example.com" />
          </Field>
        </div>
        <Button disabled={!consentId.trim() || (!purposeKeyList.length && !vendorDomainList.length)} loading={busy} onClick={evaluate}>
          {busy ? "Evaluating..." : "Evaluate agent permission"}
        </Button>
      </FormCard>

      {error ? <Alert variant="error" role="alert">{error}</Alert> : null}

      {result ? (
        <FormCard
          title="Evaluation result"
          titleExtra={<Badge variant={result.allowed ? "success" : "danger"}>{result.allowed ? "Allowed" : "Denied"}</Badge>}
          description={`Consent is ${result.consentState.replaceAll("_", " ")} · ${result.reasonCode.replaceAll("_", " ")}`}
        >
          <div className="table-scroll rounded-xl border border-[var(--border)]">
            <table className="data-table">
              <caption className="sr-only">Permission decisions by requested purpose and vendor</caption>
              <thead><tr><th scope="col">Request</th><th scope="col">Type</th><th scope="col">Decision</th><th scope="col">Reason</th></tr></thead>
              <tbody>
                {(result.purposeDetails ?? []).map((item) => (
                  <tr key={`purpose:${item.key}`}><th scope="row" className="text-left font-medium">{item.key}</th><td>Purpose</td><td><Badge variant={item.allowed ? "success" : "danger"}>{item.allowed ? "Allowed" : "Denied"}</Badge></td><td>{item.reason.replaceAll("_", " ")}</td></tr>
                ))}
                {(result.vendorDetails ?? []).map((item) => (
                  <tr key={`vendor:${item.domain}`}><th scope="row" className="text-left font-medium">{item.domain}</th><td>Vendor</td><td><Badge variant={item.allowed ? "success" : "danger"}>{item.allowed ? "Allowed" : "Denied"}</Badge></td><td>{item.reason.replaceAll("_", " ")}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.reasons?.length ? <Alert variant="warning">{result.reasons.join(" · ")}</Alert> : null}
          <p className="text-xs text-[var(--muted-foreground)]">Audit request ID: <span className="font-mono">{result.requestId}</span></p>
        </FormCard>
      ) : (
        <EmptyState title="No evaluation yet" description="Enter a consent ID and at least one purpose or vendor, then run the permission check." />
      )}
    </div>
  );
}

