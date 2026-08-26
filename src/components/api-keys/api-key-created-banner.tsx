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
      // Fallback: select the text manually if clipboard API is unavailable.
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-5">
      <div className="mb-1 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-green-800">
            API key created — copy it now
          </p>
          <p className="mt-0.5 text-xs text-green-700">
            &ldquo;{keyName}&rdquo; — This is the only time the full key will be shown. It cannot be retrieved again.
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded p-1 text-green-600 hover:bg-green-100"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-md border border-green-200 bg-white px-3 py-2 font-mono text-sm text-neutral-900 select-all">
          {fullKey}
        </code>

        <button
          type="button"
          onClick={copyKey}
          className="shrink-0 rounded-md border border-green-300 bg-white px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-50"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
