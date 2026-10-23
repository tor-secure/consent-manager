"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";
import { SiteFavicon } from "@/components/websites/website-list";

export function SecretValue({ value }: { value: string }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const masked = "•".repeat(Math.min(Math.max(value.length, 12), 28));

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--muted-foreground)]">
        {shown ? value : masked}
      </code>
      <button
        type="button"
        onClick={() => setShown((current) => !current)}
        className="shrink-0 text-xs font-semibold text-[var(--primary)]"
      >
        {shown ? "Hide" : "Show"}
      </button>
      <button type="button" onClick={copy} className="shrink-0 text-xs font-semibold text-[var(--primary)]">
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function WebsiteIconControl({
  websiteId,
  domain,
  iconUrl,
}: {
  websiteId: string;
  domain: string;
  iconUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { pending, run } = useAsyncAction();
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(iconUrl);

  async function save(next: string | null) {
    setError("");
    await run(async () => {
      const result = await dashboardFetch(
        `/api/websites/${websiteId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ iconUrl: next }),
        },
        {
          successMessage: next ? "Website icon saved" : "Website icon removed",
          errorFallback: "Unable to save the website icon.",
          onValidation: setError,
        },
      );
      if (!result.ok) {
        setPreview(iconUrl);
        return;
      }
      setPreview(next);
      router.refresh();
    });
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Use a PNG, JPG, or WebP icon.");
      return;
    }
    if (file.size > 150 * 1024) {
      setError("Icon must be 150 KB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setPreview(result);
      void save(result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex items-center gap-3">
      <SiteFavicon domain={domain} iconUrl={preview} className="h-12 w-12 rounded-2xl text-base" />
      <div className="min-w-0">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(event) => {
            onFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          className="text-sm font-semibold text-[var(--primary)] disabled:opacity-50"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? "Saving icon..." : preview ? "Change icon" : "Add icon"}
        </button>
        {preview ? (
          <button
            type="button"
            className="ml-3 text-sm font-semibold text-[var(--muted-foreground)] disabled:opacity-50"
            disabled={pending}
            onClick={() => void save(null)}
          >
            Remove
          </button>
        ) : null}
        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">PNG, JPG, or WebP. 150 KB max.</p>
        {error ? <p className="mt-1 text-xs text-[var(--danger)]">{error}</p> : null}
      </div>
    </div>
  );
}
