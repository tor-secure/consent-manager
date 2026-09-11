"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dashboardFetch } from "@/components/feedback/use-async-action";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

function fmt(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function ApiKeyManager({ initialKeys }: { initialKeys: ApiKeyRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [createdKey, setCreatedKey] = useState<{ fullKey: string; name: string } | null>(null);

  async function revokeKey(id: string) {
    if (!window.confirm("Revoke this API key? Applications using it will stop working immediately.")) {
      return;
    }
    if (revoking) return;
    setRevoking(id);
    setError("");
    const result = await dashboardFetch(
      `/api/api-keys/${id}`,
      { method: "DELETE" },
      {
        successMessage: "API key revoked successfully",
        errorFallback: "Unable to revoke API key. Please try again.",
        onValidation: setError,
      },
    );
    setRevoking(null);
    if (!result.ok) return;
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      {/* One-time key banner */}
      {createdKey && (
        <ApiKeyCreatedBanner
          fullKey={createdKey.fullKey}
          keyName={createdKey.name}
          onDismiss={() => setCreatedKey(null)}
        />
      )}

      {/* Error */}
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
      <CreateApiKeyForm
        onCreated={(k) => {
          setCreatedKey(k);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      {/* Empty state */}
      {initialKeys.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--muted)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                className="text-[var(--border)]">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">No API keys yet</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Create an API key to integrate with the CMP API.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keys table */}
      {initialKeys.length > 0 && (
        <Card>
          <div className="table-scroll scrollbar-thin">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/60">
                  {["Name", "Key prefix", "Environment", "Status", "Last used", "Expires", "Created", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {initialKeys.map((key) => {
                  const isExpired = key.expiresAt ? new Date(key.expiresAt) < new Date() : false;
                  return (
                    <tr
                      key={key.id}
                      className={`group transition-colors hover:bg-[var(--muted)]/80 ${key.status === "revoked" ? "opacity-60" : ""}`}
                    >
                      <td className="px-5 py-3.5 font-medium text-[var(--foreground)]">{key.name}</td>
                      <td className="px-5 py-3.5">
                        <code className="rounded-lg bg-[var(--secondary)] px-2 py-0.5 font-mono text-xs text-[var(--muted-foreground)] group-hover:bg-[var(--info-soft)] group-hover:text-[var(--primary)] transition-colors">
                          {key.keyPrefix}…
                        </code>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={key.environment === "live" ? "success" : "neutral"}
                          size="sm"
                          className="capitalize"
                        >
                          {key.environment}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={key.status === "active" ? "success" : key.status === "revoked" ? "danger" : "neutral"}
                          size="sm"
                          className="capitalize"
                        >
                          {key.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-[var(--muted-foreground)]">{fmt(key.lastUsedAt)}</td>
                      <td className="px-5 py-3.5">
                        {key.expiresAt ? (
                          <span className={isExpired ? "text-[var(--danger)]" : "text-[var(--muted-foreground)]"}>
                            {fmt(key.expiresAt)}
                          </span>
                        ) : (
                          <span className="text-[var(--muted-foreground)]">Never</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-[var(--muted-foreground)]">{fmt(key.createdAt)}</td>
                      <td className="px-5 py-3.5 text-right">
                        {key.status === "active" && (
                          <button
                            type="button"
                            disabled={isPending || revoking === key.id}
                            onClick={() => revokeKey(key.id)}
                            className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--danger)] shadow-sm transition hover:bg-[var(--danger-soft)] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
                          >
                            {revoking === key.id ? "Deleting..." : "Revoke"}
                          </button>
                        )}
                        {key.status === "revoked" && key.revokedAt && (
                          <span className="text-xs text-[var(--muted-foreground)]">
                            Revoked {fmt(key.revokedAt)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
