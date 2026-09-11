"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { HoverGlassCard } from "@/components/ui/hover-glass-card";

export type WebsiteNextAction = {
  label: string;
  href: string;
};

export type WebsiteRow = {
  id: string;
  name: string;
  domain: string;
  environment: string;
  status: string;
  defaultLanguage: string;
  defaultRegion: string | null;
  verified: boolean;
  createdAt: Date;
  nextAction?: WebsiteNextAction;
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: "success" | "neutral" | "danger"; label: string }> = {
    active: { variant: "success", label: "Active" },
    inactive: { variant: "neutral", label: "Inactive" },
    suspended: { variant: "danger", label: "Suspended" },
  };
  const item = map[status] ?? map.inactive;
  return <Badge variant={item.variant} size="sm">{item.label}</Badge>;
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--success)]">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="6" fill="var(--success)" />
          <path d="M4 7l2 2 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)]">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="6" stroke="var(--border)" strokeWidth="1.4" fill="none" />
        <path d="M4.5 7h5" stroke="var(--border)" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      Not verified
    </span>
  );
}

export function WebsiteList({ websites }: { websites: WebsiteRow[] }) {
  const [query, setQuery] = useState("");

  const filtered =
    query.trim() === ""
      ? websites
      : websites.filter(
          (w) =>
            w.name.toLowerCase().includes(query.toLowerCase()) ||
            w.domain.toLowerCase().includes(query.toLowerCase()),
        );

  return (
    <div>
      {websites.length > 0 && (
        <div className="relative mb-7 max-w-md">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <label htmlFor="website-search" className="sr-only">Search websites</label>
          <input
            id="website-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search websites…"
            className="field-input pl-12 h-11"
          />
        </div>
      )}

      {websites.length === 0 && (
        <EmptyState
          title="No websites yet"
          description="Add your first website to start configuring consent management and unlock analytics."
          actionLabel="Add your first website"
          actionHref="/dashboard/websites/new"
        />
      )}

      {websites.length > 0 && filtered.length === 0 && (
        <div className="rounded-3xl card-shadow bg-[var(--card)] p-10 text-center border-2 border-dashed border-[var(--border)]">
          <p className="text-sm font-medium text-[var(--foreground)]">
            No websites match &ldquo;<span className="text-[var(--foreground)]">{query}</span>&rdquo;
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-3 text-sm text-[var(--primary)] font-medium hover:text-[var(--primary)] underline underline-offset-4"
          >
            Clear search
          </button>
        </div>
      )}

      {filtered.length > 0 && (
        <ul role="list" className="grid gap-6 py-2 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((website) => (
            <li key={website.id} className="min-w-0">
              <HoverGlassCard
                href={`/dashboard/websites/${website.id}`}
                className="h-full min-h-[254px] w-full flex-col p-5 text-left font-medium sm:p-6"
              >
                <div className="flex w-full items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-[var(--foreground)]">
                      {website.name}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium text-[var(--muted-foreground)]">
                      {website.domain}
                    </p>
                  </div>
                  <StatusBadge status={website.status} />
                </div>

                <dl className="mt-5 w-full space-y-2 text-sm font-medium">
                  <div className="flex items-center justify-between">
                    <dt className="text-[var(--muted-foreground)]">Environment</dt>
                    <dd className="capitalize text-[var(--foreground)]">
                      {website.environment}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[var(--muted-foreground)]">Region</dt>
                    <dd className="text-[var(--foreground)]">
                      {website.defaultRegion ?? "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[var(--muted-foreground)]">Language</dt>
                    <dd className="uppercase tracking-wide text-[var(--foreground)]">
                      {website.defaultLanguage}
                    </dd>
                  </div>
                </dl>

                <div className="mt-auto w-full space-y-3 border-t border-[var(--border)] pt-4">
                  <VerifiedBadge verified={website.verified} />
                  {website.nextAction ? (
                    <span className="inline-flex rounded-full bg-[var(--info-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--primary)]">
                      Next: {website.nextAction.label}
                    </span>
                  ) : null}
                </div>
              </HoverGlassCard>
            </li>
          ))}
          <li className="min-w-0">
            <HoverGlassCard
              href="/dashboard/websites/new"
              className="h-full min-h-[254px] w-full flex-col gap-2 p-5 font-bold sm:p-6"
            >
              <span className="text-lg">Add website</span>
              <span className="text-sm font-medium text-[var(--muted-foreground)]">Click me</span>
            </HoverGlassCard>
          </li>
        </ul>
      )}
    </div>
  );
}
