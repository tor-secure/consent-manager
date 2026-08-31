"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
    setRevoking(id); setError("");
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to revoke key");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setRevoking(null); }
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
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <svg className="h-4 w-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 16 16"
            stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <circle cx="8" cy="8" r="6" /><path strokeLinecap="round" d="M8 5v3M8 11h.01" />
          </svg>
          {error}
          <button onClick={() => setError("")} className="ml-auto shrink-0 text-rose-400 hover:text-rose-600">✕</button>
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                className="text-slate-300">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">No API keys yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Create an API key to integrate with the CMP API.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keys table */}
      {initialKeys.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {["Name", "Key prefix", "Environment", "Status", "Last used", "Expires", "Created", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialKeys.map((key) => {
                  const isExpired = key.expiresAt ? new Date(key.expiresAt) < new Date() : false;
                  return (
                    <tr
                      key={key.id}
                      className={`group transition-colors hover:bg-slate-50/80 ${key.status === "revoked" ? "opacity-60" : ""}`}
                    >
                      <td className="px-5 py-3.5 font-medium text-slate-900">{key.name}</td>
                      <td className="px-5 py-3.5">
                        <code className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">
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
                      <td className="px-5 py-3.5 text-slate-500">{fmt(key.lastUsedAt)}</td>
                      <td className="px-5 py-3.5">
                        {key.expiresAt ? (
                          <span className={isExpired ? "text-rose-500" : "text-slate-500"}>
                            {fmt(key.expiresAt)}
                          </span>
                        ) : (
                          <span className="text-slate-400">Never</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{fmt(key.createdAt)}</td>
                      <td className="px-5 py-3.5 text-right">
                        {key.status === "active" && (
                          <button
                            type="button"
                            disabled={isPending || revoking === key.id}
                            onClick={() => revokeKey(key.id)}
                            className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                          >
                            {revoking === key.id ? "Revoking…" : "Revoke"}
                          </button>
                        )}
                        {key.status === "revoked" && key.revokedAt && (
                          <span className="text-xs text-slate-400">
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
