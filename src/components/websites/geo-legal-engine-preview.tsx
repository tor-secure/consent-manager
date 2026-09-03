"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";

type LegalEnginePayload = {
  confidence: number;
  regulationSource: string;
  policyReason: string;
  selected: { key: string; label: string; version: string } | null;
  reasoning: { code: string; detail: string }[];
  alternatives: { key: string; label: string; score: number }[];
  ux: {
    consentModel: string;
    rejectAllRecommended: boolean;
    preferenceCenterRequired: boolean;
    googleConsentMode: boolean;
    iabTcf: boolean;
    iabGpp: boolean;
  };
  geo: { country: string | null; region: string | null; source: string };
  disclaimer: string;
};

export function GeoLegalEnginePreview({ websiteId }: { websiteId: string }) {
  const { pending, run } = useAsyncAction();
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [result, setResult] = useState<LegalEnginePayload | null>(null);

  async function resolveEngine() {
    await run(async () => {
      const response = await dashboardFetch(
        `/api/websites/${websiteId}/legal-engine`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            country: country.trim() || null,
            region: region.trim() || null,
          }),
        },
        {
          successMessage: "Legal engine updated",
          errorFallback: "Unable to resolve regulation for that location.",
          silentSuccess: true,
        },
      );
      if (!response.ok) return;
      const data = response.data as { legalEngine?: LegalEnginePayload };
      setResult(data.legalEngine ?? null);
    });
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] card-shadow">
      <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Geo legal engine</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Rank catalog profiles for a visitor country/region, then apply this website&apos;s jurisdiction rules. Operational only — not legal advice.
        </p>
      </div>
      <div className="space-y-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Country (ISO)" htmlFor="legal-country">
            <Input
              id="legal-country"
              value={country}
              onChange={(event) => setCountry(event.target.value.toUpperCase())}
              maxLength={2}
              placeholder="IN"
            />
          </Field>
          <Field label="Region / state" htmlFor="legal-region">
            <Input
              id="legal-region"
              value={region}
              onChange={(event) => setRegion(event.target.value.toUpperCase())}
              maxLength={16}
              placeholder="CA"
            />
          </Field>
        </div>
        <Button type="button" onClick={resolveEngine} loading={pending}>
          {pending ? "Resolving…" : "Run engine"}
        </Button>

        {result ? (
          <div className="space-y-4 text-sm">
            <p className="font-medium text-slate-800">
              {result.selected
                ? `${result.selected.label} ${result.selected.version}`
                : "No catalog match"}
              <span className="ml-2 font-normal text-slate-500">
                confidence {result.confidence}% · {result.regulationSource} · policy {result.policyReason}
              </span>
            </p>
            <p className="text-slate-500">
              Geo {result.geo.country ?? "—"}
              {result.geo.region ? ` / ${result.geo.region}` : ""} ({result.geo.source}). Model: {result.ux.consentModel}.
            </p>
            <ul className="space-y-2">
              {result.reasoning.map((step) => (
                <li key={step.code} className="rounded-xl bg-slate-50 px-3 py-2 text-slate-600">
                  {step.detail}
                </li>
              ))}
            </ul>
            {result.alternatives.length > 0 ? (
              <p className="text-xs text-slate-500">
                Alternatives: {result.alternatives.map((row) => `${row.label} (${row.score})`).join(", ")}
              </p>
            ) : null}
            <p className="text-xs text-slate-400">{result.disclaimer}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
