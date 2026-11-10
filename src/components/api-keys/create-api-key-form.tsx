"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";

type CreatedKey = { fullKey: string; name: string };

export function CreateApiKeyForm({
  onCreated,
  compact = false,
}: {
  onCreated: (created: CreatedKey) => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState<"live" | "test">("live");
  const [expiresAt, setExpiresAt] = useState("");
  const { pending: saving, run } = useAsyncAction();
  const [error, setError] = useState("");
  const [open, setOpen] = useState(!compact);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await run(async () => {
      setError("");
      const result = await dashboardFetch(
        "/api/api-keys",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, environment, expiresAt: expiresAt || null }),
        },
        {
          successMessage: "API key created successfully",
          errorFallback: "Unable to create API key. Please try again.",
          onValidation: setError,
        },
      );
      if (!result.ok) return;
      const fullKey =
        typeof result.data === "object" &&
        result.data !== null &&
        "fullKey" in result.data &&
        typeof (result.data as { fullKey?: unknown }).fullKey === "string"
          ? (result.data as { fullKey: string }).fullKey
          : "";
      onCreated({ fullKey, name });
      setName("");
      setEnvironment("live");
      setExpiresAt("");
      if (compact) setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M7 1v12M1 7h12" />
        </svg>
        Create API key
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-sm,0_1px_2px_rgb(0_0_0/0.04))]"
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Create API key</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Keys include <code className="font-mono text-xs">consent:subject</code>,{" "}
            <code className="font-mono text-xs">consent:evaluate</code>, and{" "}
            <code className="font-mono text-xs">data:redact</code>.
          </p>
        </div>
        {compact ? (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError("");
            }}
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            Cancel
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="api-key-name">
            Key name
          </label>
          <input
            id="api-key-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={255}
            placeholder="Branch Selector production"
            className="field-input"
          />
        </div>

        <div>
          <span className="field-label">Environment</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(["live", "test"] as const).map((env) => {
              const selected = environment === env;
              return (
                <button
                  key={env}
                  type="button"
                  onClick={() => setEnvironment(env)}
                  className={[
                    "rounded-xl border px-3 py-3 text-left transition-colors",
                    selected
                      ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,var(--card))]"
                      : "border-[var(--border)] hover:bg-[var(--muted)]/50",
                  ].join(" ")}
                >
                  <p className="text-sm font-semibold capitalize text-[var(--foreground)]">{env}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                    {env === "live" ? "Production traffic" : "Safe for staging"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="api-key-expiry">
            Expiry date <span className="font-normal text-[var(--muted-foreground)]">(optional)</span>
          </label>
          <input
            id="api-key-expiry"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="field-input"
          />
          <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">
            Leave blank for a non-expiring key. You can revoke anytime.
          </p>
        </div>
      </div>

      {error ? (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="submit" loading={saving}>
          {saving ? "Generating…" : "Generate key"}
        </Button>
        {compact ? null : (
          <p className="text-xs text-[var(--muted-foreground)]">
            The full secret is shown once after creation.
          </p>
        )}
      </div>
    </form>
  );
}
