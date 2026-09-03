"use client";

import { useMemo, useState } from "react";

type WebsiteRow = { id: string; name: string; domain: string | null };

type PortableConsentExportResponse = {
  success: boolean;
  claims: unknown;
  proof: unknown;
};

export default function PortableConsentTool({ websites }: { websites: WebsiteRow[] }) {
  const [consentId, setConsentId] = useState("");
  const [fromWebsiteId, setFromWebsiteId] = useState(websites[0]?.id ?? "");
  const [targetWebsiteId, setTargetWebsiteId] = useState(websites[0]?.id ?? "");

  const [portableBundle, setPortableBundle] = useState<{ claims: unknown; proof: unknown } | null>(null);
  const [importResult, setImportResult] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const websiteIdSuggestions = useMemo(() => websites.map((w) => w.id), [websites]);

  async function exportPortable() {
    setBusy(true);
    setError(null);
    setImportResult(null);
    try {
      const qs = new URLSearchParams({
        consentId: consentId.trim(),
        websiteId: fromWebsiteId,
      });
      const r = await fetch(`/api/consent/portable/export?${qs.toString()}`);
      const data = (await r.json()) as PortableConsentExportResponse & { message?: string };
      if (!data.success) throw new Error(data.message || "Export failed");

      setPortableBundle({ claims: data.claims, proof: data.proof });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function importPortable() {
    if (!portableBundle) {
      setError("Export a portable bundle first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/consent/portable/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claims: portableBundle.claims,
          proof: portableBundle.proof,
          targetWebsiteId,
        }),
      });
      const data = await r.json();
      if (!data.success) throw new Error(data.message || "Import failed");
      setImportResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-medium text-slate-900">Portable consent exchange</p>
        <p className="mt-1 text-sm text-slate-500">
          Export a consent from one site, then import it onto another site&apos;s active policy.
          This is integrity-checked and maps by purpose keys / vendor domains.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Consent ID</label>
          <input
            className="input w-full"
            value={consentId}
            onChange={(e) => setConsentId(e.target.value)}
            placeholder="e.g. CMP generated consent_id"
            list="cmp-website-id-suggestions"
          />
          <datalist id="cmp-website-id-suggestions">
            {websiteIdSuggestions.map((id) => (
              <option key={id} value={id} />
            ))}
          </datalist>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">From website</label>
          <select className="select w-full" value={fromWebsiteId} onChange={(e) => setFromWebsiteId(e.target.value)}>
            {websites.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.domain ?? "no-domain"})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 lg:col-span-2">
          <label className="text-sm font-medium text-slate-700">Target website</label>
          <select
            className="select w-full"
            value={targetWebsiteId}
            onChange={(e) => setTargetWebsiteId(e.target.value)}
          >
            {websites.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.domain ?? "no-domain"})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="btn btn-primary" disabled={busy || !consentId} onClick={exportPortable}>
          {busy ? "Working..." : "Export portable consent"}
        </button>
        <button className="btn btn-secondary" disabled={busy || !portableBundle} onClick={importPortable}>
          Import onto target website
        </button>
      </div>

      {error ? <div className="text-sm text-rose-700">{error}</div> : null}

      {portableBundle ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-900">Portable bundle ready</p>
          <p className="mt-1 text-xs text-slate-500">Claims/proof are what your SDK will store on device.</p>
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-xs text-slate-800">
            {JSON.stringify(portableBundle, null, 2)}
          </pre>
        </div>
      ) : null}

      {importResult ? (
        <div className="rounded-2xl border border-slate-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-slate-900">Import result</p>
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-xs text-slate-800">
            {JSON.stringify(importResult, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

