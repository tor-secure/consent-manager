"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";
import type { ChildProtectionConfig } from "@/lib/children/types";

const inputCls = "field-input";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function ChildProtectionForm({
  websiteId,
  initial,
}: {
  websiteId: string;
  initial: ChildProtectionConfig;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [childDirected, setChildDirected] = useState(initial.childDirected);
  const [ageAssuranceRequired, setAgeAssuranceRequired] = useState(initial.ageAssuranceRequired);
  const [minimumAge, setMinimumAge] = useState(initial.minimumAge ? String(initial.minimumAge) : "");
  const [guardianConsentRequired, setGuardianConsentRequired] = useState(initial.guardianConsentRequired);
  const [restrictedPurposeKeys, setRestrictedPurposeKeys] = useState(initial.restrictedPurposeKeys.join(", "));
  const [minimumAssurance, setMinimumAssurance] = useState(initial.minimumAssurance);
  const [sessionId, setSessionId] = useState("");
  const [attestKind, setAttestKind] = useState<"age" | "guardian">("age");
  const { pending: saving, run } = useAsyncAction();
  const { pending: attesting, run: runAttest } = useAsyncAction();
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(async () => {
      setError("");
      const result = await dashboardFetch(
        `/api/websites/${websiteId}/child-protection`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled,
            childDirected,
            ageAssuranceRequired: ageAssuranceRequired || childDirected,
            minimumAge: minimumAge ? Number(minimumAge) : null,
            guardianConsentRequired,
            restrictedPurposeKeys: restrictedPurposeKeys.split(",").map((item) => item.trim()).filter(Boolean),
            minimumAssurance,
          }),
        },
        {
          successMessage: "Child protection updated",
          errorFallback: "Unable to save child protection.",
          onValidation: setError,
        },
      );
      if (!result.ok) return;
      router.refresh();
    });
  }

  async function handleAttest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAttest(async () => {
      setError("");
      const result = await dashboardFetch(
        `/api/websites/${websiteId}/child-protection/attest`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, kind: attestKind }),
        },
        {
          successMessage: "Staff attestation recorded. This is not a legal certification.",
          errorFallback: "Unable to attest this session.",
          onValidation: setError,
        },
      );
      if (!result.ok) return;
      setSessionId("");
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          Enable child protection
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={childDirected} onChange={(event) => setChildDirected(event.target.checked)} />
          Website is child-directed
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={ageAssuranceRequired || childDirected}
            onChange={(event) => setAgeAssuranceRequired(event.target.checked)}
          />
          Age assurance required
        </label>
        <Field label="Minimum age threshold" hint="Set per website/jurisdiction. Do not assume one global age.">
          <input className={inputCls} value={minimumAge} onChange={(event) => setMinimumAge(event.target.value)} inputMode="numeric" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={guardianConsentRequired}
            onChange={(event) => setGuardianConsentRequired(event.target.checked)}
          />
          Guardian consent required for under-threshold visitors
        </label>
        <Field label="Restricted purpose keys" hint="Comma-separated. Essential purposes stay available unless you list them here.">
          <textarea
            className={inputCls}
            rows={3}
            value={restrictedPurposeKeys}
            onChange={(event) => setRestrictedPurposeKeys(event.target.value)}
          />
        </Field>
        <Field label="Minimum assurance to unlock restricted processing">
          <select
            className={inputCls}
            value={minimumAssurance}
            onChange={(event) => setMinimumAssurance(event.target.value as ChildProtectionConfig["minimumAssurance"])}
          >
            <option value="assured">Staff/third-party assurance</option>
            <option value="guardian">Guardian staff attestation</option>
            <option value="self_declaration">Self-declaration only (not verified)</option>
          </select>
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save child protection"}</Button>
      </form>

      <form onSubmit={handleAttest} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">Staff attestation</h2>
        <p className="text-sm text-slate-500">
          Enter a session ID only. This page does not list child or guardian identities.
          Email token success is not legal guardian authority.
        </p>
        <Field label="Age-assurance session ID">
          <input className={inputCls} value={sessionId} onChange={(event) => setSessionId(event.target.value)} />
        </Field>
        <Field label="Attestation kind">
          <select
            className={inputCls}
            value={attestKind}
            onChange={(event) => setAttestKind(event.target.value === "guardian" ? "guardian" : "age")}
          >
            <option value="age">Age assured</option>
            <option value="guardian">Guardian approved</option>
          </select>
        </Field>
        <Button type="submit" disabled={attesting || !sessionId.trim()}>
          {attesting ? "Recording…" : "Record attestation"}
        </Button>
      </form>
    </div>
  );
}
