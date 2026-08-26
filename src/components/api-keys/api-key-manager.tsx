"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreateApiKeyForm } from "./create-api-key-form";
import { ApiKeyCreatedBanner } from "./api-key-created-banner";

export type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  environment: string;
  status: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

function EnvironmentBadge({ env }: { env: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        env === "live"
          ? "bg-green-50 text-green-700 ring-1 ring-green-600/20"
          : "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-500/20"
      }`}
    >
      {env}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-50 text-green-700 ring-1 ring-green-600/20",
    revoked: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
    expired: "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-500/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status] ?? styles.expired}`}
    >
      {status}
    </span>
  );
}

function fmt(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ApiKeyManager({ initialKeys }: { initialKeys: ApiKeyRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [createdKey, setCreatedKey] = useState<{ fullKey: string; name: string } | null>(null);

  async function revokeKey(id: string) {
    setRevoking(id);
    setError("");
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to revoke key");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRevoking(null);
    }
  }

  return (
    <div>
      {/* One-time secret banner */}
      {createdKey && (
        <ApiKeyCreatedBanner
          fullKey={createdKey.fullKey}
          keyName={createdKey.name}
          onDismiss={() => setCreatedKey(null)}
        />
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Create form */}
      <div className="mb-6">
        <CreateApiKeyForm
          onCreated={(k) => {
            setCreatedKey(k);
            // Scroll to top so the banner is visible.
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>

      {/* Empty state */}
      {initialKeys.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium text-neutral-600">No API keys yet</p>
          <p className="mt-1 text-sm text-neutral-400">
            Create an API key to integrate with the CMP API.
          </p>
        </div>
      )}

      {/* Keys table */}
      {initialKeys.length > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="min-w-full divide-y text-sm">
            <thead>
              <tr className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Key prefix</th>
                <th className="px-5 py-3">Environment</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Last used</th>
                <th className="px-5 py-3">Expires</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {initialKeys.map((key) => (
                <tr
                  key={key.id}
                  className={`transition hover:bg-neutral-50 ${key.status === "revoked" ? "opacity-60" : ""}`}
                >
                  <td className="px-5 py-3 font-medium text-neutral-900">
                    {key.name}
                  </td>
                  <td className="px-5 py-3">
                    <code className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-700">
                      {key.keyPrefix}…
                    </code>
                  </td>
                  <td className="px-5 py-3">
                    <EnvironmentBadge env={key.environment} />
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={key.status} />
                  </td>
                  <td className="px-5 py-3 text-neutral-500">{fmt(key.lastUsedAt)}</td>
                  <td className="px-5 py-3 text-neutral-500">
                    {key.expiresAt ? (
                      <span className={new Date(key.expiresAt) < new Date() ? "text-red-500" : ""}>
                        {fmt(key.expiresAt)}
                      </span>
                    ) : (
                      "Never"
                    )}
                  </td>
                  <td className="px-5 py-3 text-neutral-500">{fmt(key.createdAt)}</td>
                  <td className="px-5 py-3 text-right">
                    {key.status === "active" && (
                      <button
                        type="button"
                        disabled={isPending || revoking === key.id}
                        onClick={() => revokeKey(key.id)}
                        className="rounded px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                      >
                        {revoking === key.id ? "Revoking…" : "Revoke"}
                      </button>
                    )}
                    {key.status === "revoked" && key.revokedAt && (
                      <span className="text-xs text-neutral-400">
                        Revoked {fmt(key.revokedAt)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
