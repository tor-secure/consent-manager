"use client";

import { useMemo, useState } from "react";

type WebsiteRow = { id: string; name: string };

export default function DataRedactionTool({ websites }: { websites: WebsiteRow[] }) {
  const [websiteId, setWebsiteId] = useState(websites[0]?.id ?? "");
  const [consentId, setConsentId] = useState("");
  const [days, setDays] = useState("30");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

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
      const data = await r.json();
      if (!data.success) throw new Error(data.message || "Redaction request failed");
      setResult(data.analytics);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-medium text-slate-900">Real-time consent-based redaction</p>
        <p className="mt-1 text-sm text-slate-500">
          Shows how consent-purpose exposure is redacted for a specific consent record (MVP: purpose breakdown filtering).
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Website</label>
          <select className="select w-full" value={websiteId} onChange={(e) => setWebsiteId(e.target.value)}>
            {websites.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Consent ID</label>
          <input className="input w-full" value={consentId} onChange={(e) => setConsentId(e.target.value)} placeholder="Consent consent_id" />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <label className="text-sm font-medium text-slate-700">Days window</label>
          <input className="input w-full" value={days} onChange={(e) => setDays(e.target.value)} placeholder="30" />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="btn btn-primary" disabled={busy || !canRun} onClick={run}>
          {busy ? "Loading..." : "Load redacted analytics"}
        </button>
      </div>

      {error ? <div className="text-sm text-rose-700">{error}</div> : null}

      {result ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-900">Analytics (redacted view)</p>
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-xs text-slate-800">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

