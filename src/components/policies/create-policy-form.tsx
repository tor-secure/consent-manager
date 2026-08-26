"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type WebsiteOption = {
  id: string;
  name: string;
  domain: string;
};

export function CreatePolicyForm({
  websites,
  defaultWebsiteId,
}: {
  websites: WebsiteOption[];
  defaultWebsiteId?: string;
}) {
  const router = useRouter();

  const [websiteId, setWebsiteId] = useState(
    defaultWebsiteId ?? websites[0]?.id ?? "",
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId,
          name,
          description: description.trim() || null,
          isDefault,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to create policy");
      }

      // Navigate to the new policy detail page.
      router.push(`/dashboard/policies/${data.policy.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-5 text-base font-semibold text-neutral-900">
          Policy details
        </h2>

        <div className="space-y-5">
          {/* Website */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Website
            </label>
            {websites.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No websites found. Add a website before creating a policy.
              </p>
            ) : (
              <select
                value={websiteId}
                onChange={(e) => setWebsiteId(e.target.value)}
                required
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
              >
                {websites.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.domain})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Policy name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={255}
              placeholder="Default Consent Policy"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Description{" "}
              <span className="font-normal text-neutral-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
          </div>

          {/* Default flag */}
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            <span className="text-sm text-neutral-700">
              Set as the default policy for this website
            </span>
          </label>
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
          disabled={saving || websites.length === 0}
          className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create policy"}
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
