"use client";

import { useMemo, useState, useTransition } from "react";
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

export function ApiKeyManager({
  initialKeys,
  showCreate = true,
}: {
  initialKeys: ApiKeyRow[];
  showCreate?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "revoked">("all");
  const [createdKey, setCreatedKey] = useState<{ fullKey: string; name: string } | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return initialKeys;
    return initialKeys.filter((key) => key.status === filter);
  }, [filter, initialKeys]);

  const counts = useMemo(
    () => ({
      all: initialKeys.length,
      active: initialKeys.filter((k) => k.status === "active").length,
      revoked: initialKeys.filter((k) => k.status === "revoked").length,
    }),
    [initialKeys],
  );

  async function revokeKey(id: string) {
    if (!window.confirm("Revoke this API key? Apps using it will stop working immediately.")) {
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
    <div className="space-y-5">
      {createdKey ? (
        <ApiKeyCreatedBanner
          fullKey={createdKey.fullKey}
          keyName={createdKey.name}
          onDismiss={() => setCreatedKey(null)}
        />
      ) : null}

      {error ? (
        <div className="flex items-center gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
          <button
            type="button"
            onClick={() => setError("")}
            className="ml-auto shrink-0 text-[var(--danger)]"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      ) : null}

      {showCreate ? (
        <CreateApiKeyForm
          compact
          onCreated={(key) => {
            setCreatedKey(key);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] p-1">
          {(
            [
              ["all", "All", counts.all],
              ["active", "Active", counts.active],
              ["revoked", "Revoked", counts.revoked],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={[
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                filter === id
                  ? "bg-[var(--muted)] text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
              ].join(" ")}
            >
              {label}
              <span className="ml-1.5 text-xs tabular-nums text-[var(--muted-foreground)]">{count}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          Prefix shown only — full secrets are never stored in recoverable form.
        </p>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--muted)]">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--muted-foreground)]"
              >
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {initialKeys.length === 0 ? "No API keys yet" : "No keys in this filter"}
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {initialKeys.length === 0
                  ? "Create a key to call Consent Guru from your backend."
                  : "Try another status filter."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="table-scroll scrollbar-thin">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/60">
                  {["Name", "Prefix", "Environment", "Status", "Last used", "Expires", "Created", ""].map(
                    (heading) => (
                      <th
                        key={heading || "action"}
                        className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]"
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((key) => {
                  const isExpired = key.expiresAt ? new Date(key.expiresAt) < new Date() : false;
                  return (
                    <tr
                      key={key.id}
                      className={`group transition-colors hover:bg-[var(--muted)]/70 ${
                        key.status === "revoked" ? "opacity-70" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-[var(--foreground)]">{key.name}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <code className="rounded-lg bg-[var(--secondary)] px-2 py-0.5 font-mono text-xs text-[var(--muted-foreground)]">
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
                          variant={
                            key.status === "active"
                              ? "success"
                              : key.status === "revoked"
                                ? "danger"
                                : "neutral"
                          }
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
                        {key.status === "active" ? (
                          <button
                            type="button"
                            disabled={isPending || revoking === key.id}
                            onClick={() => revokeKey(key.id)}
                            className="btn btn-danger btn-sm"
                          >
                            {revoking === key.id ? "Revoking…" : "Revoke"}
                          </button>
                        ) : key.revokedAt ? (
                          <span className="text-xs text-[var(--muted-foreground)]">
                            Revoked {fmt(key.revokedAt)}
                          </span>
                        ) : null}
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
