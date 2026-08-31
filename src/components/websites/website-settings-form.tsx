"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

const inputCls = "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 transition disabled:bg-slate-50 disabled:opacity-60";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-slate-700">{label}</p>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
        <code className="block overflow-x-auto font-mono text-sm text-slate-500">{value}</code>
      </div>
      <p className="mt-1 text-xs text-slate-400">Cannot be changed after creation.</p>
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess(false);
    try {
      const res = await fetch(`/api/websites/${website.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description.trim() || null,
          environment,
          defaultLanguage,
          defaultRegion: defaultRegion || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to save settings");
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* General */}
      <div className="rounded-2xl bg-white card-shadow">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">General</h2>
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
      <div className="rounded-2xl bg-white card-shadow">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Locale defaults</h2>
        </div>
        <div className="grid gap-5 p-6 sm:grid-cols-2">
          <Field label="Default language">
            <select value={defaultLanguage} onChange={(e) => setDefaultLanguage(e.target.value)} className={inputCls}>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="kn">Kannada</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="es">Spanish</option>
              <option value="pt">Portuguese</option>
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
      <div className="rounded-2xl bg-white card-shadow">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Identity</h2>
        </div>
        <div className="space-y-5 p-6">
          <ReadOnlyField label="Domain" value={website.domain} />
          <ReadOnlyField label="Site key" value={website.siteKey} />
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 16 16"
            stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <circle cx="8" cy="8" r="6" /><path strokeLinecap="round" d="M8 5v3M8 11h.01" />
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 16 16"
            stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3.5 3.5L13 4.5" />
          </svg>
          Settings saved successfully.
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving}
          className="inline-flex items-center rounded-2xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
          Cancel
        </button>
      </div>
    </form>
  );
}
