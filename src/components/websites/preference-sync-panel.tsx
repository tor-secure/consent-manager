"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";

type EndpointView = {
  id: string;
  websiteId: string;
  url: string;
  status: string;
  lastDeliveryAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  hasSigningSecret: boolean;
};

function SecretBanner({
  secret,
  onDismiss,
}: {
  secret: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="rounded-2xl border border-[color-mix(in_srgb,var(--success)_28%,transparent)] bg-[var(--success-soft)] p-5">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--success)]">
            Preference sync signing secret — copy it now
          </p>
          <p className="mt-0.5 text-xs text-[var(--success)]">
            Shown only once. Verify HMAC signatures on your receiver with this{" "}
            <code className="font-mono">whsec_…</code> value.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-[var(--success)] underline underline-offset-2"
        >
          Dismiss
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto rounded-xl bg-[var(--background)] px-3 py-2 font-mono text-xs text-[var(--foreground)]">
          {secret}
        </code>
        <Button type="button" variant="secondary" size="sm" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

export function PreferenceSyncPanel({ websiteId }: { websiteId: string }) {
  const router = useRouter();
  const { pending, run } = useAsyncAction();
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [endpoint, setEndpoint] = useState<EndpointView | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const result = await dashboardFetch(
        `/api/websites/${websiteId}/preference-sync`,
        undefined,
        {
          successMessage: "",
          errorFallback: "Unable to load preference sync settings.",
          silentSuccess: true,
          onValidation: setError,
        },
      );
      if (cancelled) return;
      if (!result.ok) {
        setLoading(false);
        return;
      }
      const data = result.data as { endpoint?: EndpointView | null };
      const row = data.endpoint ?? null;
      setEndpoint(row);
      setUrl(row?.url ?? "");
      setEnabled(row ? row.status !== "disabled" : true);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [websiteId]);

  async function save(regenerateSecret = false) {
    await run(async () => {
      setError("");
      const result = await dashboardFetch(
        `/api/websites/${websiteId}/preference-sync`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            status: enabled ? "active" : "disabled",
            regenerateSecret,
          }),
        },
        {
          successMessage: regenerateSecret
            ? "Signing secret regenerated"
            : "Preference sync saved",
          errorFallback: "Unable to save preference sync settings.",
          onValidation: setError,
        },
      );
      if (!result.ok) return;
      const data = result.data as {
        signingSecret?: string | null;
        endpoint?: EndpointView;
      };
      setEndpoint(data.endpoint ?? null);
      if (typeof data.signingSecret === "string" && data.signingSecret) {
        setSecret(data.signingSecret);
      }
      router.refresh();
    });
  }

  async function remove() {
    if (!endpoint) return;
    if (!window.confirm("Remove the preference sync endpoint for this website?")) return;
    await run(async () => {
      setError("");
      const result = await dashboardFetch(
        `/api/websites/${websiteId}/preference-sync`,
        { method: "DELETE" },
        {
          successMessage: "Preference sync endpoint removed",
          errorFallback: "Unable to remove preference sync endpoint.",
          onValidation: setError,
        },
      );
      if (!result.ok) return;
      setEndpoint(null);
      setUrl("");
      setEnabled(true);
      setSecret(null);
      router.refresh();
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--foreground)]">Preference sync</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          After a signed-in visitor saves preferences, Consent Guru POSTs a signed webhook to your
          site so you can mirror choices and alert owners. Confirmation emails stay separate.
        </p>
      </div>

      {secret ? <SecretBanner secret={secret} onDismiss={() => setSecret(null)} /> : null}

      {loading ? (
        <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="preference-sync-url" className="field-label">
              HTTPS receiver URL
            </label>
            <input
              id="preference-sync-url"
              className="field-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-site.com/api/cmp/preference-sync"
              autoComplete="off"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Enable preference sync for this website
          </label>

          {endpoint?.lastDeliveryAt ? (
            <p className="text-xs text-[var(--muted-foreground)]">
              Last delivery: {new Date(endpoint.lastDeliveryAt).toLocaleString()}
            </p>
          ) : null}

          {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={pending || !url.trim()} onClick={() => void save(false)}>
              {endpoint ? "Save" : "Create endpoint"}
            </Button>
            {endpoint ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => void save(true)}
                >
                  Regenerate secret
                </Button>
                <Button type="button" variant="secondary" disabled={pending} onClick={() => void remove()}>
                  Remove
                </Button>
              </>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
