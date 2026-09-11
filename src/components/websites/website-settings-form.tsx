"use client";

import { cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";
import { LocaleSelectOptions } from "@/components/i18n/locale-select-options";

export type WebsiteSettingsData = {
  id: string;
  name: string;
  description: string | null;
  environment: string;
  defaultLanguage: string;
  defaultRegion: string | null;
  domain: string;
  siteKey: string;
};

const inputCls = "field-input";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const fieldId = `website-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string }>, { id: fieldId })
    : children;
  return (
    <div>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]">{label}</label>
      {control}
      {hint && <p className="mt-1 text-xs text-[var(--muted-foreground)]">{hint}</p>}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-[var(--foreground)]">{label}</p>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2">
        <code className="block overflow-x-auto font-mono text-sm text-[var(--muted-foreground)]">{value}</code>
      </div>
      <p className="mt-1 text-xs text-[var(--muted-foreground)]">Cannot be changed after creation.</p>
    </div>
  );
}

export function WebsiteSettingsForm({ website }: { website: WebsiteSettingsData }) {
  const router = useRouter();
  const [name, setName] = useState(website.name);
  const [description, setDescription] = useState(website.description ?? "");
  const [environment, setEnvironment] = useState(website.environment);
  const [defaultLanguage, setDefaultLanguage] = useState(website.defaultLanguage);
  const [defaultRegion, setDefaultRegion] = useState(website.defaultRegion ?? "");
  const { pending: saving, run } = useAsyncAction();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await run(async () => {
      setError("");
      const result = await dashboardFetch(
        `/api/websites/${website.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description: description.trim() || null,
            environment,
            defaultLanguage,
            defaultRegion: defaultRegion || null,
          }),
        },
        {
          successMessage: "Website updated successfully",
          errorFallback: "Unable to save website settings. Please try again.",
          onValidation: setError,
        },
      );
      if (!result.ok) return;
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* General */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] card-shadow">
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-base font-semibold text-[var(--foreground)]">General</h2>
        </div>
        <div className="space-y-5 p-6">
          <Field label="Website name">
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} className={inputCls} />
          </Field>
          <Field label="Description" hint="Optional — visible only to your team.">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1000} className={inputCls} />
          </Field>
          <Field label="Environment">
            <select value={environment} onChange={(e) => setEnvironment(e.target.value)} className={inputCls}>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </select>
          </Field>
        </div>
      </div>

      {/* Locale */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] card-shadow">
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Locale defaults</h2>
        </div>
        <div className="grid gap-5 p-6 sm:grid-cols-2">
          <Field label="Default language">
            <select value={defaultLanguage} onChange={(e) => setDefaultLanguage(e.target.value)} className={inputCls}>
              <LocaleSelectOptions includeCurrent={defaultLanguage} />
            </select>
          </Field>
          <Field label="Default region">
            <select value={defaultRegion} onChange={(e) => setDefaultRegion(e.target.value)} className={inputCls}>
              <option value="">— None —</option>
              <option value="IN">India</option>
              <option value="EU">European Union</option>
              <option value="US">United States</option>
              <option value="UK">United Kingdom</option>
              <option value="AU">Australia</option>
              <option value="CA">Canada</option>
            </select>
          </Field>
        </div>
      </div>

      {/* Identity (read-only) */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] card-shadow">
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Identity</h2>
        </div>
        <div className="space-y-5 p-6">
          <ReadOnlyField label="Domain" value={website.domain} />
          <ReadOnlyField label="Site key" value={website.siteKey} />
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-[var(--danger)]" fill="none" viewBox="0 0 16 16"
            stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <circle cx="8" cy="8" r="6" /><path strokeLinecap="round" d="M8 5v3M8 11h.01" />
          </svg>
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
        <button type="button" onClick={() => router.back()}
          className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm transition hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
          Cancel
        </button>
      </div>
    </form>
  );
}
