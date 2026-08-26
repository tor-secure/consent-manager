"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreateWebhookForm } from "./create-webhook-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DeliveryRow = {
  id: string;
  eventType: string;
  status: string;
  attemptNumber: number;
  responseStatusCode: number | null;
  errorMessage: string | null;
  sentAt: Date | null;
  completedAt: Date | null;
};

export type WebhookEndpointRow = {
  id: string;
  name: string;
  url: string;
  description: string | null;
  status: string;
  subscribedEvents: string[];
  verified: boolean;
  lastDeliveryAt: Date | null;
  createdAt: Date;
  // Recent deliveries for this endpoint (pre-fetched server-side)
  deliveries: DeliveryRow[];
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function DeliveryStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    success: "bg-green-50 text-green-700",
    failed: "bg-red-50 text-red-700",
    pending: "bg-neutral-100 text-neutral-600",
    retrying: "bg-amber-50 text-amber-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  );
}

function EndpointStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
      status === "active"
        ? "bg-green-50 text-green-700 ring-1 ring-green-600/20"
        : "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-500/20"
    }`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function fmt(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtTime(date: Date | null) {
  if (!date) return "—";
  return `${fmt(date)} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
}

// ---------------------------------------------------------------------------
// Signing secret one-time banner (reuse ApiKeyCreatedBanner pattern)
// ---------------------------------------------------------------------------

function SigningSecretBanner({
  secret,
  name,
  onDismiss,
}: {
  secret: string;
  name: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  return (
    <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-5">
      <div className="mb-1 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-green-800">
            Webhook signing secret — copy it now
          </p>
          <p className="mt-0.5 text-xs text-green-700">
            &ldquo;{name}&rdquo; — This secret is shown only once. Use it to verify webhook
            signatures on your server.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded p-1 text-green-600 hover:bg-green-100"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-md border border-green-200 bg-white px-3 py-2 font-mono text-sm text-neutral-900 select-all">
          {secret}
        </code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-md border border-green-300 bg-white px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-50"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single endpoint card
// ---------------------------------------------------------------------------

function EndpointCard({
  endpoint,
  onToggle,
  onDelete,
  busyId,
}: {
  endpoint: WebhookEndpointRow;
  onToggle: (id: string, newStatus: "active" | "disabled") => void;
  onDelete: (id: string) => void;
  busyId: string | null;
}) {
  const [showDeliveries, setShowDeliveries] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isActive = endpoint.status === "active";

  return (
    <div className="rounded-lg border bg-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-neutral-900">{endpoint.name}</p>
            <EndpointStatusBadge status={endpoint.status} />
            {endpoint.verified && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                Verified
              </span>
            )}
          </div>
          <code className="mt-1 block truncate font-mono text-xs text-neutral-500">
            {endpoint.url}
          </code>
          {endpoint.description && (
            <p className="mt-1 text-sm text-neutral-500">{endpoint.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
            <span>Created {fmt(endpoint.createdAt)}</span>
            {endpoint.lastDeliveryAt && (
              <span>Last delivery {fmt(endpoint.lastDeliveryAt)}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={busyId === endpoint.id}
            onClick={() => onToggle(endpoint.id, isActive ? "disabled" : "active")}
            className="rounded-md border px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
          >
            {busyId === endpoint.id ? "…" : isActive ? "Disable" : "Enable"}
          </button>

          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded-md border px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-neutral-500">Confirm?</span>
              <button
                type="button"
                disabled={busyId === endpoint.id}
                onClick={() => onDelete(endpoint.id)}
                className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-40"
              >
                Yes, delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-md border px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Subscribed events */}
      {endpoint.subscribedEvents.length > 0 && (
        <div className="border-t px-5 py-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Subscribed events ({endpoint.subscribedEvents.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {endpoint.subscribedEvents.map((ev) => (
              <code
                key={ev}
                className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-600"
              >
                {ev}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Delivery history toggle */}
      <div className="border-t px-5 py-3">
        <button
          type="button"
          onClick={() => setShowDeliveries((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
            className={`transition-transform ${showDeliveries ? "rotate-90" : ""}`}
          >
            <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Delivery history ({endpoint.deliveries.length})
        </button>

        {showDeliveries && (
          <div className="mt-3">
            {endpoint.deliveries.length === 0 ? (
              <p className="text-xs text-neutral-400">No deliveries yet.</p>
            ) : (
              <div className="overflow-hidden rounded-md border">
                <table className="min-w-full divide-y text-xs">
                  <thead className="bg-neutral-50 text-neutral-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium uppercase tracking-wide">Event</th>
                      <th className="px-3 py-2 text-left font-medium uppercase tracking-wide">Status</th>
                      <th className="px-3 py-2 text-left font-medium uppercase tracking-wide">HTTP</th>
                      <th className="px-3 py-2 text-left font-medium uppercase tracking-wide">Attempt</th>
                      <th className="px-3 py-2 text-left font-medium uppercase tracking-wide">Sent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-white">
                    {endpoint.deliveries.map((d) => (
                      <tr key={d.id} className="hover:bg-neutral-50">
                        <td className="px-3 py-2">
                          <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-neutral-600">
                            {d.eventType}
                          </code>
                        </td>
                        <td className="px-3 py-2">
                          <DeliveryStatusBadge status={d.status} />
                        </td>
                        <td className="px-3 py-2 text-neutral-600">
                          {d.responseStatusCode ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-neutral-500">#{d.attemptNumber}</td>
                        <td className="px-3 py-2 text-neutral-400">{fmtTime(d.sentAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WebhookEndpointManager — top-level client component
// ---------------------------------------------------------------------------

export function WebhookEndpointManager({
  initialEndpoints,
}: {
  initialEndpoints: WebhookEndpointRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [createdSecret, setCreatedSecret] = useState<{
    secret: string;
    name: string;
  } | null>(null);

  async function toggleEndpoint(id: string, newStatus: "active" | "disabled") {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/webhooks/endpoints/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to update endpoint");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteEndpoint(id: string) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/webhooks/endpoints/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to delete endpoint");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {/* One-time secret banner */}
      {createdSecret && (
        <SigningSecretBanner
          secret={createdSecret.secret}
          name={createdSecret.name}
          onDismiss={() => setCreatedSecret(null)}
        />
      )}

      {/* Global error */}
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Create form */}
      <div className="mb-6">
        <CreateWebhookForm
          onCreated={(created) => {
            setCreatedSecret({ secret: created.signingSecret, name: created.name });
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>

      {/* Empty state */}
      {initialEndpoints.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium text-neutral-600">No webhook endpoints yet</p>
          <p className="mt-1 text-sm text-neutral-400">
            Create an endpoint to start receiving webhook events.
          </p>
        </div>
      )}

      {/* Endpoint list */}
      {initialEndpoints.length > 0 && (
        <div className="space-y-4">
          {initialEndpoints.map((ep) => (
            <EndpointCard
              key={ep.id}
              endpoint={ep}
              onToggle={toggleEndpoint}
              onDelete={deleteEndpoint}
              busyId={busyId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
