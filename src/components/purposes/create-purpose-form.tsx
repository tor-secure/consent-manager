"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Derive key from name: lowercase, replace non-alphanumeric runs with _, trim _.
function deriveKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);
}

export function CreatePurposeForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(value: string) {
    setName(value);
    // Auto-populate key only while the user hasn't manually edited it.
    if (!keyTouched) {
      setKey(deriveKey(value));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/purposes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          key: key.trim() || deriveKey(name),
          description: description.trim() || null,
          isRequired,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to create purpose");
      }

      router.push("/dashboard/purposes");
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
          Purpose details
        </h2>

        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              maxLength={150}
              placeholder="Analytics"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
          </div>

          {/* Key */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Key{" "}
              <span className="font-normal text-neutral-400">
                (unique identifier, auto-generated)
              </span>
            </label>
            <input
              value={key}
              onChange={(e) => {
                setKeyTouched(true);
                // Allow only lowercase letters, digits, underscores.
                setKey(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, "")
                    .slice(0, 100),
                );
              }}
              required
              maxLength={100}
              placeholder="analytics"
              className="w-full rounded-md border px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
            <p className="mt-1 text-xs text-neutral-400">
              Lowercase letters, digits, and underscores only. Cannot be changed
              after creation.
            </p>
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

          {/* Status */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Status
            </label>
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
          </div>

          {/* Required */}
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            <span className="text-sm text-neutral-700">
              This purpose is required (visitor cannot decline)
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
          disabled={saving}
          className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create purpose"}
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
