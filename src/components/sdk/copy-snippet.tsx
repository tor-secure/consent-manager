"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// CopyButton — standalone copy-to-clipboard button
// ---------------------------------------------------------------------------

export function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore — clipboard unavailable in some contexts.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-md border bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100"
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6l3 3 5-5" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <rect x="4.5" y="1.5" width="6" height="7.5" rx="1" stroke="currentColor" strokeWidth="1.25" />
            <path d="M1.5 4.5v6a1 1 0 0 0 1 1h6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// CodeBlock — syntax-highlighted-ish code block with copy button
// ---------------------------------------------------------------------------

export function CodeBlock({
  code,
  language = "html",
  label,
}: {
  code: string;
  language?: string;
  label?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between border-b bg-neutral-50 px-4 py-2">
        <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
          {label ?? language}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto bg-neutral-900 p-4 text-sm text-neutral-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VerifyInstallation — click-to-verify button
// Calls the public SDK config endpoint to confirm the siteKey resolves correctly.
// ---------------------------------------------------------------------------

export function VerifyInstallation({ siteKey }: { siteKey: string }) {
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function verify() {
    setStatus("checking");
    setMessage("");
    try {
      const res = await fetch(`/api/sdk/${siteKey}/config`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus("error");
        setMessage(data.message ?? "Configuration not found.");
        return;
      }

      const hasPurposes = Array.isArray(data.purposes) && data.purposes.length > 0;
      const isPublished = data.policy?.isPublished === true;

      if (!hasPurposes) {
        setStatus("error");
        setMessage(
          "Configuration loaded but no purposes are attached to the active policy version. Add purposes before deploying.",
        );
        return;
      }

      setStatus("ok");
      setMessage(
        `Configuration verified. Policy "${data.policy.name}" v${data.policy.version}${isPublished ? " (published)" : " — draft"}. ${data.purposes.length} purpose${data.purposes.length !== 1 ? "s" : ""} loaded.`,
      );
    } catch {
      setStatus("error");
      setMessage("Request failed. Check your network and try again.");
    }
  }

  return (
    <div className="rounded-lg border p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-900">
            Verify configuration
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            Confirm that the SDK config endpoint resolves correctly for this
            site key.
          </p>
        </div>

        <button
          type="button"
          onClick={verify}
          disabled={status === "checking"}
          className="shrink-0 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {status === "checking" ? "Checking…" : "Verify now"}
        </button>
      </div>

      {status === "ok" && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0" aria-hidden="true">
            <circle cx="8" cy="8" r="7" fill="#16a34a" />
            <path d="M5 8l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {message}
        </div>
      )}

      {status === "error" && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0" aria-hidden="true">
            <circle cx="8" cy="8" r="7" fill="#dc2626" />
            <path d="M8 5v3M8 10.5v.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {message}
        </div>
      )}
    </div>
  );
}
