"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { dashboardFetch } from "@/components/feedback/use-async-action";
import { Select } from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IntegrationEntry = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  provider: string;
  iconUrl: string | null;
  documentationUrl: string | null;
  isOfficial: boolean;
  connections: ConnectionEntry[];
};

export type ConnectionEntry = {
  connectionId: string;
  websiteId: string;
  websiteName: string;
  websiteDomain: string;
  status: string;
  enabled: boolean;
  connectedAt: Date | null;
};

export type WebsiteOption = {
  id: string;
  name: string;
  domain: string;
};

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

function CategoryBadge({ category }: { category: string }) {
  const variantMap: Record<string, "primary" | "purple" | "warning" | "success" | "neutral"> = {
    analytics:       "primary",
    "tag-manager":   "purple",
    advertising:     "warning",
    "customer-data": "success",
    "consent-mode":  "success",
    crm:             "purple",
    other:           "neutral",
  };
  return (
    <Badge variant={variantMap[category] ?? "neutral"} size="sm" className="capitalize">
      {category.replace(/-/g, " ")}
    </Badge>
  );
}

function OfficialBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-xs font-medium text-[var(--success)] ring-1 ring-[color-mix(in_srgb,var(--success)_22%,transparent)]">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
        <circle cx="5" cy="5" r="4.25" fill="var(--success)" />
        <path d="M3 5l1.5 1.5 2.5-3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Official
    </span>
  );
}

// ---------------------------------------------------------------------------
// Single integration card
// ---------------------------------------------------------------------------

function IntegrationCard({
  integration, websites,
}: { integration: IntegrationEntry; websites: WebsiteOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedWebsiteId, setSelectedWebsiteId] = useState(websites[0]?.id ?? "");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const connectedIds = new Set(integration.connections.map((c) => c.websiteId));
  const unconnected  = websites.filter((w) => !connectedIds.has(w.id));

  async function connect() {
    if (!selectedWebsiteId || busyId) return;
    setBusyId("connect"); setError("");
    const result = await dashboardFetch(
      "/api/integrations/connect",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId: integration.id, websiteId: selectedWebsiteId }),
      },
      {
        successMessage: "Integration connected successfully",
        errorFallback: "Unable to connect integration. Please try again.",
        onValidation: setError,
      },
    );
    setBusyId(null);
    if (!result.ok) return;
    startTransition(() => router.refresh());
  }

  async function disconnect(connectionId: string) {
    if (busyId) return;
    setBusyId(connectionId); setError("");
    const result = await dashboardFetch(
      `/api/integrations/${connectionId}/disconnect`,
      { method: "DELETE" },
      {
        successMessage: "Integration disconnected successfully",
        errorFallback: "Unable to disconnect integration. Please try again.",
        onValidation: setError,
      },
    );
    setBusyId(null);
    if (!result.ok) return;
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] card-shadow p-5">
      {/* Header */}
      <div className="icon-text-row">
        {integration.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={integration.iconUrl}
            alt={integration.name}
            width={36}
            height={36}
            data-icon-tile
            className="h-9 w-9 shrink-0 rounded-xl object-contain"
          />
        ) : (
          <div
            data-icon-tile
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--muted)] text-base font-bold text-[var(--muted-foreground)]"
          >
            {integration.name.charAt(0)}
          </div>
        )}

        <div className="icon-text-body">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold leading-snug text-[var(--foreground)]">{integration.name}</p>
            {integration.isOfficial && <OfficialBadge />}
            <CategoryBadge category={integration.category} />
          </div>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{integration.provider}</p>
        </div>
      </div>

      {/* Description */}
      {integration.description && (
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">{integration.description}</p>
      )}

      {/* Connected websites */}
      {integration.connections.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Connected ({integration.connections.length})
          </p>
          <ul role="list" className="space-y-1.5">
            {integration.connections.map((c) => (
              <li
                key={c.connectionId}
                className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-[var(--foreground)]">{c.websiteName}</span>
                  <span className="ml-1.5 text-xs text-[var(--muted-foreground)] hidden sm:inline">{c.websiteDomain}</span>
                  {c.connectedAt && (
                    <span className="ml-2 text-xs text-[var(--muted-foreground)] hidden sm:inline">
                      since {c.connectedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={isPending || busyId === c.connectionId}
                  onClick={() => disconnect(c.connectionId)}
                  className="btn btn-danger btn-sm shrink-0"
                >
                  {busyId === c.connectionId ? "…" : "Disconnect"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Connect selector */}
      {unconnected.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Select
            value={selectedWebsiteId}
            onChange={(e) => setSelectedWebsiteId(e.target.value)}
            size="sm"
            className="flex-1"
          >
            {unconnected.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.domain})
              </option>
            ))}
          </Select>
          <button
            type="button"
            disabled={isPending || busyId === "connect" || !selectedWebsiteId}
            onClick={connect}
            className="btn btn-primary btn-sm shrink-0"
          >
            {busyId === "connect" ? "…" : "Connect"}
          </button>
        </div>
      )}

      {unconnected.length === 0 && websites.length > 0 && (
        <p className="mt-4 text-xs text-[var(--muted-foreground)]">Connected to all your websites.</p>
      )}

      {/* Error */}
      {error && (
        <p className="mt-2 rounded-xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
          {error}
        </p>
      )}

      {/* Documentation */}
      {integration.documentationUrl && (
        <a
          href={integration.documentationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto pt-4 text-xs text-[var(--muted-foreground)] underline underline-offset-2 transition hover:text-[var(--muted-foreground)]"
        >
          Documentation →
        </a>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IntegrationCatalog
// ---------------------------------------------------------------------------

export function IntegrationCatalog({
  integrations, websites,
}: { integrations: IntegrationEntry[]; websites: WebsiteOption[] }) {
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categories = [
    "all",
    ...new Set(integrations.map((i) => i.category)),
  ].sort((a, b) => (a === "all" ? -1 : b === "all" ? 1 : a.localeCompare(b)));

  const filtered = categoryFilter === "all"
    ? integrations
    : integrations.filter((i) => i.category === categoryFilter);

  const totalConnections = integrations.reduce((sum, i) => sum + i.connections.length, 0);

  return (
    <div className="space-y-5">
      {/* Category filter pills */}
      {categories.length > 2 && (
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-2xl px-3 py-1.5 text-xs font-medium capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                categoryFilter === cat
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)] hover:bg-[var(--muted)] soft-shadow"
              }`}
            >
              {cat === "all" ? `All (${integrations.length})` : cat.replace(/-/g, " ")}
            </button>
          ))}
        </div>
      )}

      {/* Summary pill */}
      {totalConnections > 0 && (
        <div className="flex items-center gap-2 rounded-2xl bg-[var(--card)] px-4 py-2 text-sm soft-shadow self-start">
          <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
          <span className="font-semibold text-[var(--foreground)]">{totalConnections}</span>
          <span className="text-[var(--muted-foreground)]">active connection{totalConnections !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Empty — no catalog */}
      {integrations.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <p className="text-sm font-semibold text-[var(--foreground)]">No integrations available</p>
            <p className="text-xs text-[var(--muted-foreground)]">Integration catalog entries will appear here once added.</p>
          </CardContent>
        </Card>
      )}

      {/* Empty — no websites */}
      {integrations.length > 0 && websites.length === 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--warning)_28%,transparent)] bg-[var(--warning-soft)] px-5 py-4 text-sm text-[var(--warning)]">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" fill="none" viewBox="0 0 16 16"
            stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" d="M8 2l6 12H2z" />
            <path strokeLinecap="round" d="M8 7v3M8 12h.01" />
          </svg>
          Add a website before connecting integrations.
        </div>
      )}

      {/* Empty filter */}
      {integrations.length > 0 && filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">No integrations in this category.</p>
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className="btn btn-outline btn-sm"
            >
              Show all
            </button>
          </CardContent>
        </Card>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              websites={websites}
            />
          ))}
        </div>
      )}
    </div>
  );
}
