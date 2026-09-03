"use client";

import { useMemo, useState } from "react";

type WebsiteRow = { id: string; name: string };

export default function AgentPermissionTool({ websites }: { websites: WebsiteRow[] }) {
  const [consentId, setConsentId] = useState("");
  const [websiteId, setWebsiteId] = useState(websites[0]?.id ?? "");

  const [purposeKeys, setPurposeKeys] = useState("");
  const [vendorDomains, setVendorDomains] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

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
      const data = await r.json();
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
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-medium text-slate-900">AI-agent permissioning</p>
        <p className="mt-1 text-sm text-slate-500">
          Evaluate whether an “agent” request (by purpose keys / vendor domains) would be allowed under the current consent decisions.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Consent ID</label>
          <input className="input w-full" value={consentId} onChange={(e) => setConsentId(e.target.value)} placeholder="Consent consent_id" />
        </div>

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

        <div className="space-y-2 lg:col-span-2">
          <label className="text-sm font-medium text-slate-700">Requested purpose keys</label>
          <input
            className="input w-full"
            value={purposeKeys}
            onChange={(e) => setPurposeKeys(e.target.value)}
            placeholder="e.g. analytics, personalization"
          />
          <p className="text-xs text-[var(--muted-foreground)]">Comma-separated. Matches purposes.key.</p>
        </div>

        <div className="space-y-2 lg:col-span-2">
          <label className="text-sm font-medium text-slate-700">Requested vendor domains</label>
          <input
            className="input w-full"
            value={vendorDomains}
            onChange={(e) => setVendorDomains(e.target.value)}
            placeholder="e.g. google-analytics.com, facebook.com"
          />
          <p className="text-xs text-[var(--muted-foreground)]">Comma-separated. Matches vendors.domain.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="btn btn-primary" disabled={busy || !consentId.trim()} onClick={evaluate}>
          {busy ? "Evaluating..." : "Evaluate agent permission"}
        </button>
      </div>

      {error ? <div className="text-sm text-rose-700">{error}</div> : null}

      {result ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-900">Result</p>
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-xs text-slate-800">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

