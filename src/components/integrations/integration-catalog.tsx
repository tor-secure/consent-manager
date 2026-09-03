"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { dashboardFetch } from "@/components/feedback/use-async-action";

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
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
        <circle cx="5" cy="5" r="4.25" fill="#16a34a" />
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
        <p className="mt-3 text-sm text-slate-500">{integration.description}</p>
      )}

      {/* Connected websites */}
      {integration.connections.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Connected ({integration.connections.length})
          </p>
          <ul role="list" className="space-y-1.5">
            {integration.connections.map((c) => (
              <li
                key={c.connectionId}
                className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-slate-800">{c.websiteName}</span>
                  <span className="ml-1.5 text-xs text-slate-400 hidden sm:inline">{c.websiteDomain}</span>
                  {c.connectedAt && (
                    <span className="ml-2 text-xs text-slate-400 hidden sm:inline">
                      since {c.connectedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={isPending || busyId === c.connectionId}
                  onClick={() => disconnect(c.connectionId)}
                  className="shrink-0 rounded-lg border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-40"
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
          <select
            value={selectedWebsiteId}
            onChange={(e) => setSelectedWebsiteId(e.target.value)}
            className="h-9 flex-1 rounded-xl border border-slate-200 bg-white px-2.5 text-sm shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 transition"
          >
            {unconnected.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.domain})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={isPending || busyId === "connect" || !selectedWebsiteId}
            onClick={connect}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {busyId === "connect" ? "…" : "Connect"}
          </button>
        </div>
      )}

      {unconnected.length === 0 && websites.length > 0 && (
        <p className="mt-4 text-xs text-slate-400">Connected to all your websites.</p>
      )}

      {/* Error */}
      {error && (
        <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}

      {/* Documentation */}
      {integration.documentationUrl && (
        <a
          href={integration.documentationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto pt-4 text-xs text-slate-400 underline underline-offset-2 transition hover:text-slate-600"
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
              className={`rounded-2xl px-3 py-1.5 text-xs font-medium capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                categoryFilter === cat
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 soft-shadow"
              }`}
            >
              {cat === "all" ? `All (${integrations.length})` : cat.replace(/-/g, " ")}
            </button>
          ))}
        </div>
      )}

      {/* Summary pill */}
      {totalConnections > 0 && (
        <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm soft-shadow self-start">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="font-semibold text-slate-800">{totalConnections}</span>
          <span className="text-slate-500">active connection{totalConnections !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Empty — no catalog */}
      {integrations.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <p className="text-sm font-semibold text-slate-700">No integrations available</p>
            <p className="text-xs text-slate-400">Integration catalog entries will appear here once added.</p>
          </CardContent>
        </Card>
      )}

      {/* Empty — no websites */}
      {integrations.length > 0 && websites.length === 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 16 16"
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
            <p className="text-sm text-slate-500">No integrations in this category.</p>
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className="text-sm font-medium text-indigo-600 transition hover:text-indigo-800"
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
