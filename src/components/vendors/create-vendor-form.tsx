"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function deriveKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 150);
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-neutral-700">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}

export function CreateVendorForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [domain, setDomain] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [source, setSource] = useState<"custom" | "iab" | "google">("custom");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(value: string) {
    setName(value);
    if (!keyTouched) setKey(deriveKey(value));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          key: key.trim() || deriveKey(name),
          domain: domain.trim() || null,
          websiteUrl: websiteUrl.trim() || null,
          privacyPolicyUrl: privacyPolicyUrl.trim() || null,
          country: country.trim() || null,
          description: description.trim() || null,
          status,
          source,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to create vendor");
      }

      router.push("/dashboard/vendors");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identity */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-5 text-base font-semibold text-neutral-900">
          Vendor identity
        </h2>

        <div className="space-y-5">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              maxLength={255}
              placeholder="Google Analytics"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
          </Field>

          <Field
            label="Key"
            hint="Lowercase letters, digits, and underscores only. Auto-generated from name."
          >
            <input
              value={key}
              onChange={(e) => {
                setKeyTouched(true);
                setKey(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, "")
                    .slice(0, 150),
                );
              }}
              required
              maxLength={150}
              placeholder="google_analytics"
              className="w-full rounded-md border px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
          </Field>

          <Field label="Domain" hint="e.g. google.com">
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              maxLength={255}
              placeholder="google.com"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
          </Field>

          <Field label="Description" hint="Optional — visible only to your team.">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
          </Field>
        </div>
      </div>

      {/* URLs */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-5 text-base font-semibold text-neutral-900">
          Links
        </h2>

        <div className="space-y-5">
          <Field label="Website URL">
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://analytics.google.com"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
          </Field>

          <Field label="Privacy policy URL">
            <input
              type="url"
              value={privacyPolicyUrl}
              onChange={(e) => setPrivacyPolicyUrl(e.target.value)}
              placeholder="https://policies.google.com/privacy"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
          </Field>
        </div>
      </div>

      {/* Classification */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-5 text-base font-semibold text-neutral-900">
          Classification
        </h2>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Country">
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              maxLength={100}
              placeholder="US"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
          </Field>

          <Field label="Source">
            <select
              value={source}
              onChange={(e) =>
                setSource(e.target.value as "custom" | "iab" | "google")
              }
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
            >
              <option value="custom">Custom</option>
              <option value="iab">IAB</option>
              <option value="google">Google</option>
            </select>
          </Field>

          <Field label="Status">
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "active" | "inactive")
              }
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create vendor"}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border px-5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
