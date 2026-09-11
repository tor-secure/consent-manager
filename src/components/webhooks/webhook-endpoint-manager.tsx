"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { dashboardFetch } from "@/components/feedback/use-async-action";
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
  deliveries: DeliveryRow[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtTime(date: Date | null) {
  if (!date) return "—";
  return `${fmt(date)} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
}

// ---------------------------------------------------------------------------
// Signing-secret one-time banner
// ---------------------------------------------------------------------------

function SigningSecretBanner({
  secret, name, onDismiss,
}: { secret: string; name: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  return (
    <div className="mb-6 rounded-2xl border border-[color-mix(in_srgb,var(--success)_28%,transparent)] bg-[var(--success-soft)] p-5">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--success)]">
            Webhook signing secret — copy it now
          </p>
          <p className="mt-0.5 text-xs text-[var(--success)]">
            &ldquo;{name}&rdquo; — Shown only once. Use it to verify webhook signatures on your server.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-xl p-1.5 text-[var(--success)] transition hover:bg-[var(--success-soft)]"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-[color-mix(in_srgb,var(--success)_28%,transparent)] bg-[var(--card)] px-3 py-2 font-mono text-sm text-[var(--foreground)] select-all">
          {secret}
        </code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-xl border border-[color-mix(in_srgb,var(--success)_28%,transparent)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--success)] transition hover:bg-[var(--success-soft)]"
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
  endpoint, onToggle, onDelete, busyId,
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
    <Card>
      {/* Header row */}
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-[var(--foreground)]">{endpoint.name}</p>
            <Badge variant={isActive ? "success" : "neutral"} size="sm" className="capitalize">
              {endpoint.status}
            </Badge>
            {endpoint.verified && (
              <Badge variant="primary" size="sm">Verified</Badge>
            )}
          </div>
          <code className="mt-1 block truncate font-mono text-xs text-[var(--muted-foreground)]">
            {endpoint.url}
          </code>
          {endpoint.description && (
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{endpoint.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--muted-foreground)]">
            <span>Created {fmt(endpoint.createdAt)}</span>
            {endpoint.lastDeliveryAt && (
              <span>Last delivery {fmt(endpoint.lastDeliveryAt)}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busyId === endpoint.id}
            onClick={() => onToggle(endpoint.id, isActive ? "disabled" : "active")}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] shadow-sm transition hover:bg-[var(--muted)] disabled:opacity-40"
          >
            {busyId === endpoint.id ? "…" : isActive ? "Disable" : "Enable"}
          </button>

          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--danger)] shadow-sm transition hover:bg-[var(--danger-soft)]"
            >
              Delete
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-[var(--muted-foreground)]">Confirm?</span>
              <button
                type="button"
                disabled={busyId === endpoint.id}
                onClick={() => onDelete(endpoint.id)}
                className="rounded-xl bg-[var(--danger)] px-2.5 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {busyId === endpoint.id ? "Deleting..." : "Yes, delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)]"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Subscribed events */}
      {endpoint.subscribedEvents.length > 0 && (
        <div className="border-t border-[var(--border)] px-5 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Subscribed events ({endpoint.subscribedEvents.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {endpoint.subscribedEvents.map((ev) => (
              <code
                key={ev}
                className="rounded-lg bg-[var(--secondary)] px-2 py-0.5 font-mono text-xs text-[var(--muted-foreground)]"
              >
                {ev}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Delivery history */}
      <div className="border-t border-[var(--border)] px-5 py-3">
        <button
          type="button"
          onClick={() => setShowDeliveries((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--muted-foreground)] transition hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 rounded-lg"
        >
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            aria-hidden="true"
            className={`transition-transform duration-150 ${showDeliveries ? "rotate-90" : ""}`}
          >
            <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Delivery history ({endpoint.deliveries.length})
        </button>

        {showDeliveries && (
          <div className="mt-3">
            {endpoint.deliveries.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)]">No deliveries yet.</p>
            ) : (
              <div className="table-scroll scrollbar-thin rounded-xl border border-[var(--border)]">
                <table className="min-w-full divide-y divide-[var(--border)] text-xs">
                  <thead className="bg-[var(--muted)]/60">
                    <tr>
                      {["Event", "Status", "HTTP", "Attempt", "Sent"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] bg-[var(--card)]">
                    {endpoint.deliveries.map((d) => (
                      <tr key={d.id} className="hover:bg-[var(--muted)]/80">
                        <td className="px-3 py-2">
                          <code className="rounded-lg bg-[var(--secondary)] px-1.5 py-0.5 font-mono text-[var(--muted-foreground)]">
                            {d.eventType}
                          </code>
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            variant={
                              d.status === "success" ? "success"
                              : d.status === "failed" ? "danger"
                              : d.status === "retrying" ? "warning"
                              : "neutral"
                            }
                            size="sm"
                            className="capitalize"
                          >
                            {d.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-[var(--muted-foreground)]">{d.responseStatusCode ?? "—"}</td>
                        <td className="px-3 py-2 text-[var(--muted-foreground)]">#{d.attemptNumber}</td>
                        <td className="px-3 py-2 text-[var(--muted-foreground)] whitespace-nowrap">{fmtTime(d.sentAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// WebhookEndpointManager
// ---------------------------------------------------------------------------

export function WebhookEndpointManager({
  initialEndpoints,
}: { initialEndpoints: WebhookEndpointRow[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [createdSecret, setCreatedSecret] = useState<{ secret: string; name: string } | null>(null);

  async function toggleEndpoint(id: string, newStatus: "active" | "disabled") {
    if (busyId) return;
    setBusyId(id); setError("");
    const result = await dashboardFetch(
      `/api/webhooks/endpoints/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      },
      {
        successMessage: newStatus === "disabled" ? "Webhook disabled successfully" : "Webhook enabled successfully",
        errorFallback: "Unable to update webhook. Please try again.",
        onValidation: setError,
      },
    );
    setBusyId(null);
    if (!result.ok) return;
    startTransition(() => router.refresh());
  }

  async function deleteEndpoint(id: string) {
    if (busyId) return;
    setBusyId(id); setError("");
    const result = await dashboardFetch(
      `/api/webhooks/endpoints/${id}`,
      { method: "DELETE" },
      {
        successMessage: "Webhook deleted successfully",
        errorFallback: "Unable to delete webhook. Please try again.",
        onValidation: setError,
      },
    );
    setBusyId(null);
    if (!result.ok) return;
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
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
        <div className="flex items-center gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          <svg className="h-4 w-4 shrink-0 text-[var(--danger)]" fill="none" viewBox="0 0 16 16"
            stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <circle cx="8" cy="8" r="6" /><path strokeLinecap="round" d="M8 5v3M8 11h.01" />
          </svg>
          {error}
          <button onClick={() => setError("")} className="ml-auto shrink-0 text-[var(--danger)] hover:text-[var(--danger)]">✕</button>
        </div>
      )}

      {/* Create form */}
      <CreateWebhookForm
        onCreated={(created) => {
          setCreatedSecret({ secret: created.signingSecret, name: created.name });
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      {/* Empty state */}
      {initialEndpoints.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
          <p className="text-sm font-medium text-[var(--muted-foreground)]">No webhook endpoints yet</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
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
