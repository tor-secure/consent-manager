"use client";

import { useState } from "react";

export function ApiKeyCreatedBanner({
  fullKey,
  keyName,
  onDismiss,
}: {
  fullKey: string;
  keyName: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(fullKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable.
    }
  }

  return (
    <div
      role="status"
      className="rounded-2xl border border-[color-mix(in_srgb,var(--success)_30%,transparent)] bg-[var(--success-soft)] p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--success)]">API key ready — copy it now</p>
          <p className="mt-1 text-sm text-[var(--success)]">
            “{keyName}” will not be shown again. Store it in your server environment variables.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded-lg p-1.5 text-[var(--success)] hover:bg-[color-mix(in_srgb,var(--success)_12%,transparent)]"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-[color-mix(in_srgb,var(--success)_28%,transparent)] bg-[var(--card)] px-3 py-2.5 font-mono text-sm text-[var(--foreground)] select-all">
          {fullKey}
        </code>
        <button
          type="button"
          onClick={copyKey}
          className="btn btn-primary shrink-0"
        >
          {copied ? "Copied" : "Copy secret"}
        </button>
      </div>

      <p className="mt-3 text-xs text-[var(--success)]">
        Use as <code className="font-mono">Authorization: Bearer …</code> from your backend only — never in the browser SDK.
      </p>
    </div>
  );
}
