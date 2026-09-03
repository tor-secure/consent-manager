"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/components/feedback/notify";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PublishState =
  | { phase: "idle" }
  | { phase: "confirm" }
  | { phase: "publishing" }
  | { phase: "success"; publishedAt: string; version: number }
  | { phase: "error"; message: string };

// ---------------------------------------------------------------------------
// PublishPolicyButton
//
// Displays the correct publish action for the current version state:
//
//   • latestVersion is null      → disabled "No version" button
//   • isPublished = true         → green "Published" badge (no action)
//   • hasPurposes = false        → disabled with tooltip explaining requirement
//   • otherwise                  → "Publish v{n}" button → confirm step → POST
//
// On success the component shows a green confirmation and calls router.refresh()
// to re-run the server page so the version table and policy status badge update.
// ---------------------------------------------------------------------------

export function PublishPolicyButton({
  policyId,
  latestVersionId,
  latestVersionNumber,
  isPublished,
  publishedAt,
  hasPurposes,
}: {
  policyId: string;
  latestVersionId: string | null;
  latestVersionNumber: number | null;
  isPublished: boolean;
  publishedAt: Date | null;
  hasPurposes: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<PublishState>({ phase: "idle" });

  // ── Already published ─────────────────────────────────────────────────────

  // ── Already published: still allow a new live version ─────────────────────

  if (isPublished && state.phase !== "success" && state.phase !== "confirm" && state.phase !== "publishing" && state.phase !== "error") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-green-600/20">
            <svg
              aria-hidden="true"
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 16 16"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3.5 3.5L13 4.5" />
            </svg>
            Published
          </span>
          {publishedAt && (
            <span className="text-xs text-neutral-400">
              {new Date(publishedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
        </div>
        {hasPurposes ? (
          <button
            onClick={() => setState({ phase: "confirm" })}
            className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
          >
            Publish new version
          </button>
        ) : (
          <p className="text-xs text-neutral-400">
            Attach at least one purpose to publish a new version.
          </p>
        )}
      </div>
    );
  }

  // ── No version exists yet ─────────────────────────────────────────────────

  if (!latestVersionId) {
    return (
      <button
        disabled
        className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-400 cursor-not-allowed"
      >
        No version to publish
      </button>
    );
  }

  // ── Success flash ─────────────────────────────────────────────────────────

  if (state.phase === "success") {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-green-600/20">
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 16 16"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3.5 3.5L13 4.5" />
          </svg>
          v{state.version} published
        </span>
        <span className="text-xs text-neutral-400">
          {new Date(state.publishedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────

  if (state.phase === "error") {
    return (
      <div className="flex flex-col gap-2">
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.message}
        </div>
        <button
          onClick={() => setState({ phase: "idle" })}
          className="self-start text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-700"
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Confirm step ──────────────────────────────────────────────────────────

  if (state.phase === "confirm") {
    return (
      <div className="flex flex-col gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-900">
          {isPublished
            ? "Publish a new live version?"
            : `Publish version v${latestVersionNumber}?`}
        </p>
        <p className="text-xs text-amber-700">
          Publishing makes this version live. Visitors will see the latest purposes,
          vendors, and banner settings. You can publish again later after more changes.
        </p>
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => {
              startTransition(async () => {
                setState({ phase: "publishing" });
                try {
                  const res = await fetch(`/api/policies/${policyId}/publish`, {
                    method: "POST",
                  });
                  const data = (await res.json()) as {
                    success: boolean;
                    message?: string;
                    alreadyPublished?: boolean;
                    missingPurposes?: boolean;
                    version?: { version: number; publishedAt: string };
                  };

                  if (!data.success) {
                    notify.error("Unable to publish policy. Please try again.");
                    setState({ phase: "error", message: "Unable to publish policy. Please try again." });
                    return;
                  }

                  notify.success("Policy published successfully");

                  setState({
                    phase: "success",
                    publishedAt: data.version!.publishedAt,
                    version: data.version!.version,
                  });
                  router.refresh();
                } catch {
                  notify.error("Unable to connect. Please try again.");
                  setState({ phase: "error", message: "Unable to connect. Please try again." });
                }
              });
            }}
            disabled={isPending}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-60"
          >
            {isPending ? "Publishing..." : isPublished ? "Yes, publish new version" : `Yes, publish v${latestVersionNumber}`}
          </button>
          <button
            onClick={() => setState({ phase: "idle" })}
            disabled={isPending}
            className="rounded-md border bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Publishing spinner (transition is in flight) ──────────────────────────

  if (state.phase === "publishing") {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white opacity-70"
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
        Publishing…
      </button>
    );
  }

  // ── Idle: missing purposes guard ─────────────────────────────────────────

  if (!hasPurposes) {
    return (
      <div className="flex flex-col gap-1.5">
        <button
          disabled
          title="Attach at least one purpose before publishing"
          className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-400 cursor-not-allowed"
        >
          Publish v{latestVersionNumber}
        </button>
        <p className="text-xs text-neutral-400">
          Attach at least one purpose to enable publishing.
        </p>
      </div>
    );
  }

  // ── Idle: ready to publish ────────────────────────────────────────────────

  return (
    <button
      onClick={() => setState({ phase: "confirm" })}
      className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
    >
      Publish v{latestVersionNumber}
    </button>
  );
}
