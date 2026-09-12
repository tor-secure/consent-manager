"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";
import type { ChildProtectionConfig } from "@/lib/children/types";

const inputCls = "field-input";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-[var(--muted-foreground)]">{hint}</p>}
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
      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <Checkbox
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          className="text-sm"
        >
          Enable child protection
        </Checkbox>
        <Checkbox
          checked={childDirected}
          onChange={(event) => setChildDirected(event.target.checked)}
          className="text-sm"
        >
          Website is child-directed
        </Checkbox>
        <Checkbox
          checked={ageAssuranceRequired || childDirected}
          onChange={(event) => setAgeAssuranceRequired(event.target.checked)}
          className="text-sm"
        >
          Age assurance required
        </Checkbox>
        <Field label="Minimum age threshold" hint="Set per website/jurisdiction. Do not assume one global age.">
          <input className={inputCls} value={minimumAge} onChange={(event) => setMinimumAge(event.target.value)} inputMode="numeric" />
        </Field>
        <Checkbox
          checked={guardianConsentRequired}
          onChange={(event) => setGuardianConsentRequired(event.target.checked)}
          className="text-sm"
        >
          Guardian consent required for under-threshold visitors
        </Checkbox>
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
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save child protection"}</Button>
      </form>

      <form onSubmit={handleAttest} className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Staff attestation</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
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
