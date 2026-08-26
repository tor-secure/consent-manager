"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Types — serializable props from the server page
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
  // Connections for this integration across org websites
  connections: ConnectionEntry[];
};

export type ConnectionEntry = {
  connectionId: string; // websiteIntegrations.id
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
  const styles: Record<string, string> = {
    analytics: "bg-blue-50 text-blue-700",
    "tag-manager": "bg-purple-50 text-purple-700",
    advertising: "bg-orange-50 text-orange-700",
    "customer-data": "bg-teal-50 text-teal-700",
    "consent-mode": "bg-green-50 text-green-700",
    crm: "bg-pink-50 text-pink-700",
    other: "bg-neutral-100 text-neutral-600",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[category] ?? styles.other}`}
    >
      {category.replace(/-/g, " ")}
    </span>
  );
}

function OfficialBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
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
  integration,
  websites,
}: {
  integration: IntegrationEntry;
  websites: WebsiteOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedWebsiteId, setSelectedWebsiteId] = useState(
    websites[0]?.id ?? "",
  );
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Which websites are not yet connected to this integration.
  const connectedWebsiteIds = new Set(
    integration.connections.map((c) => c.websiteId),
  );
  const unconnectedWebsites = websites.filter(
    (w) => !connectedWebsiteIds.has(w.id),
  );

  async function connect() {
    if (!selectedWebsiteId) return;
    setBusyId("connect");
    setError("");
    try {
      const res = await fetch("/api/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integrationId: integration.id,
          websiteId: selectedWebsiteId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to connect");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  async function disconnect(connectionId: string) {
    setBusyId(connectionId);
    setError("");
    try {
      const res = await fetch(
        `/api/integrations/${connectionId}/disconnect`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to disconnect");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col rounded-lg border bg-white p-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        {integration.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={integration.iconUrl}
            alt={integration.name}
            width={36}
            height={36}
            className="h-9 w-9 rounded-md object-contain"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-neutral-100 text-lg font-bold text-neutral-400">
            {integration.name.charAt(0)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-neutral-900">{integration.name}</p>
            {integration.isOfficial && <OfficialBadge />}
          </div>
          <p className="text-xs text-neutral-400">{integration.provider}</p>
        </div>

        <CategoryBadge category={integration.category} />
      </div>

      {/* Description */}
      {integration.description && (
        <p className="mt-3 text-sm text-neutral-500">{integration.description}</p>
      )}

      {/* Connected websites */}
      {integration.connections.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Connected ({integration.connections.length})
          </p>
          <ul role="list" className="space-y-1.5">
            {integration.connections.map((c) => (
              <li
                key={c.connectionId}
                className="flex items-center justify-between rounded-md border bg-neutral-50 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-neutral-800">{c.websiteName}</span>
                  <span className="ml-1.5 text-xs text-neutral-400">{c.websiteDomain}</span>
                  {c.connectedAt && (
                    <span className="ml-2 text-xs text-neutral-400">
                      since{" "}
                      {c.connectedAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={isPending || busyId === c.connectionId}
                  onClick={() => disconnect(c.connectionId)}
                  className="ml-3 shrink-0 rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                >
                  {busyId === c.connectionId ? "…" : "Disconnect"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Connect to another website */}
      {unconnectedWebsites.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <select
            value={selectedWebsiteId}
            onChange={(e) => setSelectedWebsiteId(e.target.value)}
            className="flex-1 rounded-md border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
          >
            {unconnectedWebsites.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.domain})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={isPending || busyId === "connect" || !selectedWebsiteId}
            onClick={connect}
            className="shrink-0 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {busyId === "connect" ? "…" : "Connect"}
          </button>
        </div>
      )}

      {unconnectedWebsites.length === 0 && websites.length > 0 && (
        <p className="mt-4 text-xs text-neutral-400">
          Connected to all your websites.
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {/* Documentation link */}
      {integration.documentationUrl && (
        <a
          href={integration.documentationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto pt-4 text-xs text-neutral-400 underline underline-offset-2 hover:text-neutral-700"
        >
          Documentation →
        </a>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IntegrationCatalog — top-level client component
// ---------------------------------------------------------------------------

export function IntegrationCatalog({
  integrations,
  websites,
}: {
  integrations: IntegrationEntry[];
  websites: WebsiteOption[];
}) {
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categories = [
    "all",
    ...new Set(integrations.map((i) => i.category)),
  ].sort((a, b) => (a === "all" ? -1 : b === "all" ? 1 : a.localeCompare(b)));

  const filtered =
    categoryFilter === "all"
      ? integrations
      : integrations.filter((i) => i.category === categoryFilter);

  // Count total active connections across all integrations.
  const totalConnections = integrations.reduce(
    (sum, i) => sum + i.connections.length,
    0,
  );

  return (
    <div>
      {/* Category filter tabs */}
      {categories.length > 2 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                categoryFilter === cat
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {cat === "all" ? `All (${integrations.length})` : cat.replace(/-/g, " ")}
            </button>
          ))}
        </div>
      )}

      {/* Summary */}
      {totalConnections > 0 && (
        <p className="mb-4 text-sm text-neutral-500">
          {totalConnections} active connection{totalConnections !== 1 ? "s" : ""} across your
          websites.
        </p>
      )}

      {/* Empty state — no integrations in catalog */}
      {integrations.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium text-neutral-600">
            No integrations available
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            Integration catalog entries will appear here once added.
          </p>
        </div>
      )}

      {/* Empty state — no websites */}
      {integrations.length > 0 && websites.length === 0 && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add a website before connecting integrations.
        </div>
      )}

      {/* Empty filter result */}
      {integrations.length > 0 && filtered.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-neutral-500">
            No integrations in this category.
          </p>
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className="mt-3 text-sm text-neutral-900 underline underline-offset-2"
          >
            Show all
          </button>
        </div>
      )}

      {/* Integration grid */}
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
