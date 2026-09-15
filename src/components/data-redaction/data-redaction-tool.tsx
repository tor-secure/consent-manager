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
type RedactionResult = {
  requestId?: string;
  dryRun?: boolean;
  consentState?: string;
  data?: unknown;
  redaction?: { removedPaths: string[] };
};

const DEFAULT_POLICY = {
  fields: [
    { path: "email", purposeKeys: ["analytics"] },
    { path: "userId", essential: true },
  ],
};

const DEFAULT_PAYLOAD = {
  email: "visitor@example.com",
  userId: "usr_123",
  notes: "optional",
};

export default function DataRedactionTool({ websites }: { websites: WebsiteRow[] }) {
  const [websiteId, setWebsiteId] = useState(websites[0]?.id ?? "");
  const [consentId, setConsentId] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [payload, setPayload] = useState(JSON.stringify(DEFAULT_PAYLOAD, null, 2));
  const [policy, setPolicy] = useState(JSON.stringify(DEFAULT_POLICY, null, 2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RedactionResult | null>(null);

  const canRun = useMemo(() => !!websiteId && !!consentId.trim(), [websiteId, consentId]);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      let data: unknown;
      let parsedPolicy: unknown;
      try {
        data = JSON.parse(payload);
        parsedPolicy = JSON.parse(policy);
      } catch {
        throw new Error("Payload and policy must be valid JSON.");
      }
      const r = await fetch("/api/intelligence/redact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId,
          consentId: consentId.trim(),
          dryRun,
          data,
          policy: parsedPolicy,
        }),
      });
      const body = (await r.json()) as { success?: boolean; message?: string } & RedactionResult;
      if (!body.success) throw new Error(body.message || "Redaction request failed");
      setResult(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <FormCard
        title="Payload redaction"
        description="Uses the same engine as /api/v1/redact. Dry run is the default so nothing is written until you uncheck it."
      >
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
          <Field label="Consent ID" htmlFor="redaction-consent">
            <Input id="redaction-consent" value={consentId} onChange={(e) => setConsentId(e.target.value)} placeholder="consent_id" autoComplete="off" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
          Dry run (no audit write)
        </label>
        <Field label="JSON payload" htmlFor="redaction-payload">
          <textarea id="redaction-payload" className="field-input min-h-32 font-mono text-xs" value={payload} onChange={(e) => setPayload(e.target.value)} />
        </Field>
        <Field label="Redaction policy" htmlFor="redaction-policy" hint="Each field needs purposeKeys, dataCategories, or essential: true.">
          <textarea id="redaction-policy" className="field-input min-h-32 font-mono text-xs" value={policy} onChange={(e) => setPolicy(e.target.value)} />
        </Field>
        <Button disabled={!canRun} loading={busy} onClick={() => void run()}>
          {busy ? "Redacting..." : dryRun ? "Preview redaction" : "Redact and audit"}
        </Button>
      </FormCard>

      {error ? <Alert variant="error" role="alert">{error}</Alert> : null}

      {result ? (
        <FormCard title="Redaction result" description={result.dryRun ? "Dry run. Audit log was not written." : `Audited request ${result.requestId ?? ""}.`}>
          <p className="text-sm">Consent state: <Badge>{result.consentState ?? "unknown"}</Badge></p>
          <p className="mt-2 text-sm">Removed paths: {result.redaction?.removedPaths.join(", ") || "none"}</p>
          <pre className="mt-3 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--muted)] p-3 text-xs">{JSON.stringify(result.data, null, 2)}</pre>
        </FormCard>
      ) : (
        <EmptyState title="No redaction run yet" description="Choose a website and consent record, then preview the payload after consent-based redaction." />
      )}
    </div>
  );
}
