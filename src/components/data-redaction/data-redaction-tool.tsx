"use client";

import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormCard } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";

type WebsiteRow = { id: string; name: string };
type RedactedAnalytics = {
  period: string;
  redacted?: boolean;
  redactionScope?: { consentId: string; notFound?: boolean };
  overview: { total: number; consentRate: number; accepted: number; rejected: number };
  purposes: Array<{ purposeId: string | null; purposeName: string; granted: number; denied?: number; total: number; grantRate: number }>;
};

function MetricIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 19V9m8 10V5m8 14v-7" /></svg>;
}

export default function DataRedactionTool({ websites }: { websites: WebsiteRow[] }) {
  const [websiteId, setWebsiteId] = useState(websites[0]?.id ?? "");
  const [consentId, setConsentId] = useState("");
  const [days, setDays] = useState("30");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RedactedAnalytics | null>(null);

  const canRun = useMemo(() => !!websiteId && !!consentId.trim(), [websiteId, consentId]);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const qs = new URLSearchParams({
        websiteId,
        days,
        redactConsentId: consentId.trim(),
      });
      const r = await fetch(`/api/analytics/consent?${qs.toString()}`);
      const data = (await r.json()) as { success?: boolean; message?: string; analytics?: RedactedAnalytics };
      if (!data.success) throw new Error(data.message || "Redaction request failed");
      if (!data.analytics) throw new Error("The analytics response was empty.");
      setResult(data.analytics);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <FormCard title="Redaction preview" description="Preview the aggregate purpose data visible under one consent record. This read-only check does not alter analytics or consent.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Website" htmlFor="redaction-website">
            <Select id="redaction-website" value={websiteId} onChange={(e) => setWebsiteId(e.target.value)}>
            {websites.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
            </Select>
          </Field>
          <Field label="Consent ID" htmlFor="redaction-consent" hint="Only purposes granted by this consent remain visible.">
            <Input id="redaction-consent" value={consentId} onChange={(e) => setConsentId(e.target.value)} placeholder="consent_id" autoComplete="off" />
          </Field>
          <Field label="Reporting window" htmlFor="redaction-days">
            <Select id="redaction-days" value={days} onChange={(e) => setDays(e.target.value)}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </Select>
          </Field>
        </div>
        <Button disabled={!canRun} loading={busy} onClick={run}>
          {busy ? "Loading..." : "Load redacted analytics"}
        </Button>
      </FormCard>

      {error ? <Alert variant="error" role="alert">{error}</Alert> : null}

      {result ? (
        <div className="space-y-4" aria-live="polite">
          {result.redactionScope?.notFound ? <Alert variant="warning">No matching consent record was found, so no purpose data is exposed.</Alert> : <Alert variant="success">Redaction applied for {result.redactionScope?.consentId ?? consentId}.</Alert>}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Visible decisions" value={result.overview.total} icon={<MetricIcon />} description={result.period} />
            <StatCard label="Consent rate" value={`${result.overview.consentRate}%`} icon={<MetricIcon />} iconColor="green" />
            <StatCard label="Visible purposes" value={result.purposes.length} icon={<MetricIcon />} iconColor="purple" />
          </div>
          {result.purposes.length ? (
            <FormCard title="Visible purpose breakdown" description="Only purpose rows allowed by the selected consent are included.">
              <div className="table-scroll rounded-xl border border-[var(--border)]">
                <table className="data-table">
                  <caption className="sr-only">Consent-redacted purpose analytics</caption>
                  <thead><tr><th scope="col">Purpose</th><th scope="col">Granted</th><th scope="col">Total</th><th scope="col">Grant rate</th></tr></thead>
                  <tbody>{result.purposes.map((row) => <tr key={row.purposeId ?? row.purposeName}><th scope="row" className="text-left font-medium">{row.purposeName}</th><td>{row.granted}</td><td>{row.total}</td><td><Badge variant={row.grantRate >= 50 ? "success" : "warning"}>{row.grantRate}%</Badge></td></tr>)}</tbody>
                </table>
              </div>
            </FormCard>
          ) : <EmptyState title="No purpose data is visible" description="The consent record is missing, has no granted purposes, or the selected period contains no matching analytics." />}
        </div>
      ) : <EmptyState title="No preview loaded" description="Choose a website, consent record, and reporting window to inspect the redacted view." />}
    </div>
  );
}

