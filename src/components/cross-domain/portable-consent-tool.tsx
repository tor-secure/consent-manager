"use client";

import { useMemo, useState } from "react";
import { notify } from "@/components/feedback/notify";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormCard } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type WebsiteRow = { id: string; name: string; domain: string | null };
type PortableDecision = { purposeKey: string | null; vendorDomain: string | null; granted: boolean };
type PortableClaims = {
  consentId: string;
  originWebsiteId: string;
  targetWebsiteId: string;
  jurisdiction: string | null;
  status: string;
  choice: string | null;
  issuedAt: string;
  exchangeExpiresAt: string;
  decisions: PortableDecision[];
};

type PortableConsentExportResponse = {
  success: boolean;
  claims: PortableClaims;
  proof: unknown;
  token?: string;
  code?: string;
  expiresAt?: string;
};
type PortableImportResult = { consentId: string; recordId: string; expiresAt: string | null; choice: string; decisions: PortableDecision[] };

export default function PortableConsentTool({ websites }: { websites: WebsiteRow[] }) {
  const [consentId, setConsentId] = useState("");
  const [fromWebsiteId, setFromWebsiteId] = useState(websites[0]?.id ?? "");
  const [targetWebsiteId, setTargetWebsiteId] = useState(websites[0]?.id ?? "");

  const [portableBundle, setPortableBundle] = useState<PortableConsentExportResponse | null>(null);
  const [importResult, setImportResult] = useState<PortableImportResult | null>(null);
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
        targetWebsiteId,
      });
      const r = await fetch(`/api/consent/portable/export?${qs.toString()}`);
      const data = (await r.json()) as PortableConsentExportResponse & { message?: string };
      if (!data.success) throw new Error(data.message || "Export failed");

      setPortableBundle(data);
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
    const targetName = websites.find((site) => site.id === targetWebsiteId)?.name ?? "the target website";
    if (!window.confirm(`Import and consume this one-time exchange on ${targetName}? This action cannot be undone.`)) return;
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
      const data = (await r.json()) as PortableImportResult & { success?: boolean; message?: string };
      if (!data.success) throw new Error(data.message || "Import failed");
      setImportResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      notify.success(`${label[0].toUpperCase()}${label.slice(1)} copied`);
    } catch {
      setError(`Unable to copy the ${label}. Select and copy it manually.`);
    }
  }

  function downloadBundle() {
    if (!portableBundle) return;
    const blob = new Blob([JSON.stringify(portableBundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `portable-consent-${portableBundle.claims.consentId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify.success("Portable bundle downloaded");
  }

  return (
    <div className="space-y-6">
      <FormCard title="Create a portable exchange" description="Export active consent from one site to a specific target. Exchanges expire after 10 minutes and can be consumed once.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Consent ID" htmlFor="portable-consent-id" hint="The active public consent_id from the source website.">
            <Input
            id="portable-consent-id"
            value={consentId}
            onChange={(e) => setConsentId(e.target.value)}
            placeholder="consent_id"
            list="cmp-website-id-suggestions"
            autoComplete="off"
          />
          </Field>
          <datalist id="cmp-website-id-suggestions">
            {websiteIdSuggestions.map((id) => (
              <option key={id} value={id} />
            ))}
          </datalist>
          <Field label="Source website" htmlFor="portable-source">
            <Select id="portable-source" value={fromWebsiteId} onChange={(e) => setFromWebsiteId(e.target.value)}>
            {websites.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.domain ?? "no-domain"})
              </option>
            ))}
            </Select>
          </Field>
          <Field label="Target website" htmlFor="portable-target" hint="The exchange will be cryptographically bound to this website.">
            <Select
            id="portable-target"
            value={targetWebsiteId}
            onChange={(e) => setTargetWebsiteId(e.target.value)}
          >
            {websites.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.domain ?? "no-domain"})
              </option>
            ))}
            </Select>
          </Field>
        </div>
        {fromWebsiteId === targetWebsiteId ? <Alert variant="warning">Choose a different target website to make this a cross-domain exchange.</Alert> : null}
        <div className="flex flex-wrap gap-3">
        <Button disabled={!consentId.trim() || fromWebsiteId === targetWebsiteId} loading={busy} onClick={exportPortable}>
          {busy ? "Working..." : "Export portable consent"}
        </Button>
        <Button variant="secondary" disabled={!portableBundle} loading={busy} onClick={importPortable}>
          Import onto target website
        </Button>
        </div>
      </FormCard>

      {error ? <Alert variant="error" role="alert">{error}</Alert> : null}

      {portableBundle ? (
        <FormCard
          title="Portable bundle ready"
          titleExtra={<Badge variant="warning">One-time exchange</Badge>}
          description={`Issued ${new Date(portableBundle.claims.issuedAt).toLocaleString()} · expires ${new Date(portableBundle.claims.exchangeExpiresAt).toLocaleString()}`}
        >
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Status", portableBundle.claims.status],
              ["Jurisdiction", portableBundle.claims.jurisdiction ?? "Not recorded"],
              ["Choice", portableBundle.claims.choice ?? "Granular"],
              ["Decisions", String(portableBundle.claims.decisions.length)],
            ].map(([label, value]) => <div key={label} className="rounded-xl bg-[var(--muted)] p-3"><dt className="text-xs text-[var(--muted-foreground)]">{label}</dt><dd className="mt-1 font-medium capitalize text-[var(--foreground)]">{value.replaceAll("_", " ")}</dd></div>)}
          </dl>
          <div className="rounded-xl border border-[var(--border)] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Handoff code</p>
            <p className="mt-2 break-all font-mono text-xl font-semibold tracking-wider text-[var(--foreground)]">{portableBundle.code}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {portableBundle.code ? <Button variant="outline" onClick={() => copyText(portableBundle.code!, "code")}>Copy code</Button> : null}
            {portableBundle.token ? <Button variant="outline" onClick={() => copyText(portableBundle.token!, "token")}>Copy token</Button> : null}
            <Button variant="ghost" onClick={downloadBundle}>Download bundle</Button>
          </div>
          <div className="table-scroll rounded-xl border border-[var(--border)]">
            <table className="data-table">
              <caption className="sr-only">Portable consent decisions</caption>
              <thead><tr><th scope="col">Item</th><th scope="col">Type</th><th scope="col">Decision</th></tr></thead>
              <tbody>{portableBundle.claims.decisions.map((decision, index) => <tr key={`${decision.purposeKey ?? decision.vendorDomain}:${index}`}><th scope="row" className="text-left font-medium">{decision.purposeKey ?? decision.vendorDomain}</th><td>{decision.purposeKey ? "Purpose" : "Vendor"}</td><td><Badge variant={decision.granted ? "success" : "neutral"}>{decision.granted ? "Granted" : "Denied"}</Badge></td></tr>)}</tbody>
            </table>
          </div>
        </FormCard>
      ) : <EmptyState title="No exchange created" description="Choose distinct source and target websites, then export an active consent record." />}

      {importResult ? (
        <Alert variant="success">
          Imported as <span className="font-mono font-medium">{importResult.consentId}</span> with {importResult.decisions.length} mapped decisions. The exchange is now consumed.
        </Alert>
      ) : null}
    </div>
  );
}

