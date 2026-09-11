"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";

const ALL_EVENTS = [
  { value: "consent.granted",   label: "Consent granted"   },
  { value: "consent.declined",  label: "Consent declined"  },
  { value: "consent.withdrawn", label: "Consent withdrawn" },
  { value: "policy.created",    label: "Policy created"    },
  { value: "policy.published",  label: "Policy published"  },
  { value: "policy.archived",   label: "Policy archived"   },
  { value: "website.created",   label: "Website created"   },
  { value: "website.updated",   label: "Website updated"   },
  { value: "scan.completed",    label: "Scan completed"    },
  { value: "tracker.detected",  label: "Tracker detected"  },
] as const;

type CreatedEndpoint = { signingSecret: string; name: string };

const inputCls = "w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm shadow-sm outline-none focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20 transition disabled:bg-[var(--muted)] disabled:opacity-60";

export function CreateWebhookForm({ onCreated }: { onCreated: (created: CreatedEndpoint) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const { pending: saving, run } = useAsyncAction();
  const [error, setError] = useState("");

  function toggleEvent(value: string) {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }

  function toggleAll() {
    setSelectedEvents(
      selectedEvents.size === ALL_EVENTS.length
        ? new Set()
        : new Set(ALL_EVENTS.map((e) => e.value)),
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await run(async () => {
      setError("");
      const result = await dashboardFetch(
        "/api/webhooks/endpoints",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name, url,
            description: description.trim() || null,
            subscribedEvents: [...selectedEvents],
          }),
        },
        {
          successMessage: "Webhook endpoint created successfully",
          errorFallback: "Unable to create webhook. Please try again.",
          onValidation: setError,
        },
      );
      if (!result.ok) return;
      const signingSecret =
        typeof result.data === "object" &&
        result.data !== null &&
        "signingSecret" in result.data &&
        typeof (result.data as { signingSecret?: unknown }).signingSecret === "string"
          ? (result.data as { signingSecret: string }).signingSecret
          : "";
      onCreated({ signingSecret, name });
      setName(""); setUrl(""); setDescription(""); setSelectedEvents(new Set()); setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-2xl bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M7 1v12M1 7h12" />
        </svg>
        Add endpoint
      </button>
    );
  }

  const allChecked = selectedEvents.size === ALL_EVENTS.length;
  const someChecked = selectedEvents.size > 0 && !allChecked;

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-[var(--card)] card-shadow p-6">
      <h2 className="mb-5 text-base font-semibold text-[var(--foreground)]">New webhook endpoint</h2>

      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={255}
            placeholder="Production webhook" className={inputCls} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]">Endpoint URL</label>
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} required
            placeholder="https://example.com/webhooks/cmp" className={inputCls} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]">
            Description <span className="font-normal text-[var(--muted-foreground)]">(optional)</span>
          </label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} className={inputCls} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className="text-sm font-semibold text-[var(--foreground)]">Events to subscribe</label>
            <button type="button" onClick={toggleAll}
              className="text-xs font-medium text-[var(--primary)] transition hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-lg px-1">
              {allChecked ? "Deselect all" : "Select all"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ALL_EVENTS.map((ev) => (
              <label key={ev.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/60 px-3 py-2.5 text-sm transition hover:bg-[var(--muted)] hover:border-[var(--border)]">
                <input type="checkbox" checked={selectedEvents.has(ev.value)}
                  onChange={() => toggleEvent(ev.value)}
                  className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]" />
                <span className="text-[var(--foreground)]">{ev.label}</span>
              </label>
            ))}
          </div>

          {someChecked && (
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              {selectedEvents.size} event{selectedEvents.size !== 1 ? "s" : ""} selected
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-[var(--danger)]" fill="none" viewBox="0 0 16 16"
            stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <circle cx="8" cy="8" r="6" /><path strokeLinecap="round" d="M8 5v3M8 11h.01" />
          </svg>
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="submit" loading={saving}>
          {saving ? "Creating endpoint..." : "Create endpoint"}
        </Button>
        <button type="button" onClick={() => { setOpen(false); setError(""); }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm transition hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
          Cancel
        </button>
      </div>
    </form>
  );
}
