"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CreatedKey = {
  fullKey: string;
  name: string;
};

export function CreateApiKeyForm({
  onCreated,
}: {
  onCreated: (created: CreatedKey) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState<"live" | "test">("live");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          environment,
          expiresAt: expiresAt || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Failed to create key");

      // Pass the one-time key up to the parent for display.
      onCreated({ fullKey: data.fullKey, name });

      // Reset form.
      setName("");
      setEnvironment("live");
      setExpiresAt("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
      >
        Create API key
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border bg-white p-6"
    >
      <h2 className="mb-5 text-base font-semibold text-neutral-900">
        New API key
      </h2>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Key name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={255}
            placeholder="Production integration"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
          />
        </div>

        {/* Environment */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Environment
          </label>
          <div className="flex gap-3">
            {(["live", "test"] as const).map((env) => (
              <label key={env} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="environment"
                  value={env}
                  checked={environment === env}
                  onChange={() => setEnvironment(env)}
                  className="h-4 w-4"
                />
                <span className="capitalize text-neutral-700">{env}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Expiry */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Expiry date{" "}
            <span className="font-normal text-neutral-400">(optional)</span>
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create key"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(""); }}
          className="rounded-md border px-5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
