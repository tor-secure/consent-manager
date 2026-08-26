"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ALL_EVENTS = [
  { value: "consent.granted",    label: "Consent granted" },
  { value: "consent.declined",   label: "Consent declined" },
  { value: "consent.withdrawn",  label: "Consent withdrawn" },
  { value: "policy.created",     label: "Policy created" },
  { value: "policy.published",   label: "Policy published" },
  { value: "policy.archived",    label: "Policy archived" },
  { value: "website.created",    label: "Website created" },
  { value: "website.updated",    label: "Website updated" },
  { value: "scan.completed",     label: "Scan completed" },
  { value: "tracker.detected",   label: "Tracker detected" },
] as const;

type CreatedEndpoint = {
  signingSecret: string;
  name: string;
};

export function CreateWebhookForm({
  onCreated,
}: {
  onCreated: (created: CreatedEndpoint) => void;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(
    new Set(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleEvent(value: string) {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  }

  function toggleAll() {
    if (selectedEvents.size === ALL_EVENTS.length) {
      setSelectedEvents(new Set());
    } else {
      setSelectedEvents(new Set(ALL_EVENTS.map((e) => e.value)));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/webhooks/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          url,
          description: description.trim() || null,
          subscribedEvents: [...selectedEvents],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to create endpoint");

      onCreated({ signingSecret: data.signingSecret, name });

      // Reset form.
      setName("");
      setUrl("");
      setDescription("");
      setSelectedEvents(new Set());
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
        Add endpoint
      </button>
    );
  }

  const allChecked = selectedEvents.size === ALL_EVENTS.length;
  const someChecked = selectedEvents.size > 0 && !allChecked;

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-6">
      <h2 className="mb-5 text-base font-semibold text-neutral-900">
        New webhook endpoint
      </h2>

      <div className="space-y-5">
        {/* Name */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={255}
            placeholder="Production webhook"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
          />
        </div>

        {/* URL */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Endpoint URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            placeholder="https://example.com/webhooks/cmp"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Description{" "}
            <span className="font-normal text-neutral-400">(optional)</span>
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
          />
        </div>

        {/* Subscribed events */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-700">
              Events to subscribe
            </label>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-900"
            >
              {allChecked ? "Deselect all" : "Select all"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ALL_EVENTS.map((ev) => (
              <label
                key={ev.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-neutral-50"
              >
                <input
                  type="checkbox"
                  checked={selectedEvents.has(ev.value)}
                  onChange={() => toggleEvent(ev.value)}
                  className="h-4 w-4 rounded border-neutral-300"
                />
                <span className="text-neutral-700">{ev.label}</span>
              </label>
            ))}
          </div>

          {someChecked && (
            <p className="mt-1.5 text-xs text-neutral-400">
              {selectedEvents.size} event{selectedEvents.size !== 1 ? "s" : ""} selected
            </p>
          )}
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
          {saving ? "Creating…" : "Create endpoint"}
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
