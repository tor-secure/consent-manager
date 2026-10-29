"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { HoverGlassCard } from "@/components/ui/hover-glass-card";
import { PageHeaderLink } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";

export type WebsiteNextAction = {
  label: string;
  href: string;
};

export type WebsiteSetupStatus = "needs_policy" | "ready_to_publish" | "install_sdk" | "ready_to_scan";

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
  iconUrl?: string | null;
  setupStatus: WebsiteSetupStatus;
  nextAction?: WebsiteNextAction;
};

const SETUP_STATUS: Record<WebsiteSetupStatus, { label: string; variant: "warning" | "primary" | "success" }> = {
  needs_policy: { label: "Needs a policy", variant: "warning" },
  ready_to_publish: { label: "Ready to publish", variant: "warning" },
  install_sdk: { label: "Install the SDK", variant: "primary" },
  ready_to_scan: { label: "Ready to scan", variant: "success" },
};

const SHOW_ADD_CARD_LIMIT = 5;

const SETUP_STEPS = [
  { key: "policy", label: "Policy" },
  { key: "publish", label: "Publish" },
  { key: "sdk", label: "SDK" },
  { key: "scan", label: "Scan" },
] as const;

const CURRENT_STEP: Record<WebsiteSetupStatus, number> = {
  needs_policy: 0,
  ready_to_publish: 1,
  install_sdk: 2,
  ready_to_scan: 3,
};

function domainHost(domain: string) {
  return domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./i, "");
}

function domainMark(domain: string) {
  const letter = domainHost(domain).charAt(0);
  return (letter || "?").toUpperCase();
}

export function SiteFavicon({
  domain,
  iconUrl,
  className = "h-10 w-10 rounded-xl text-sm",
}: {
  domain: string;
  iconUrl?: string | null;
  className?: string;
}) {
  const host = domainHost(domain);
  const customIcon = iconUrl?.trim() || "";
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(
    customIcon || host ? "loading" : "failed",
  );
  const src = customIcon || (host ? `/api/websites/favicon?domain=${encodeURIComponent(host)}` : "");

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-[var(--info-soft)] font-bold text-[var(--primary)] ${className}`}
      aria-hidden="true"
    >
      {status === "ready" ? null : domainMark(domain)}
      {src && status !== "failed" ? (
        <img
          src={src}
          alt=""
          width={24}
          height={24}
          className={status === "ready" ? "h-6 w-6 object-contain" : "absolute h-px w-px opacity-0"}
          referrerPolicy="no-referrer"
          onLoad={() => setStatus("ready")}
          onError={() => setStatus("failed")}
        />
      ) : null}
    </span>
  );
}

function SetupProgress({ status }: { status: WebsiteSetupStatus }) {
  const current = CURRENT_STEP[status];
  return (
    <ol className="mt-5 grid w-full grid-cols-4 gap-2" aria-label="Setup progress">
      {SETUP_STEPS.map((step, index) => {
        const state = index < current ? "complete" : index === current ? "current" : "upcoming";
        return (
          <li key={step.key} className="min-w-0" aria-current={state === "current" ? "step" : undefined}>
            <span
              className={`block h-1.5 rounded-full ${
                state === "complete"
                  ? "bg-[var(--success)]"
                  : state === "current"
                    ? "bg-[var(--primary)]"
                    : "bg-[var(--border)]"
              }`}
            />
            <span
              className={`mt-1.5 block truncate text-[11px] font-semibold ${
                state === "current"
                  ? "text-[var(--primary)]"
                  : state === "complete"
                    ? "text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)]"
              }`}
            >
              {step.label}
              <span className="sr-only">
                {state === "complete" ? ", complete" : state === "current" ? ", current step" : ", not started"}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
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

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = websites.filter((website) => {
    if (!normalizedQuery) return true;
    return (
      website.name.toLowerCase().includes(normalizedQuery) ||
      website.domain.toLowerCase().includes(normalizedQuery)
    );
  });
  const needsSetupCount = websites.filter((site) => site.setupStatus !== "ready_to_scan").length;
  const resultLabel =
    filtered.length === websites.length
      ? null
      : `${filtered.length} of ${websites.length} websites`;

  return (
    <div className="min-w-0">
      {websites.length > 0 && (
        <header className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)_auto] lg:gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="page-title">Websites</h1>
              <p className="text-sm font-medium text-[var(--muted-foreground)]">
                {websites.length} connected
                {needsSetupCount > 0
                  ? ` · ${needsSetupCount} still ${needsSetupCount === 1 ? "needs" : "need"} a step`
                  : ""}
              </p>
            </div>
            <p className="page-description">
              Manage the websites connected to your Consent Management Platform.
            </p>
          </div>
          <div className="col-span-2 row-start-2 min-w-0 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:pt-0.5">
            <SearchInput
              id="website-search"
              label="Search websites"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClear={() => setQuery("")}
              placeholder="Search websites…"
            />
            {resultLabel ? (
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{resultLabel}</p>
            ) : null}
          </div>
          <div className="col-start-2 row-start-1 shrink-0 lg:col-start-3">
            <PageHeaderLink href="/dashboard/websites/new">Add website</PageHeaderLink>
          </div>
        </header>
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
        <ul role="list" className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((website, index) => (
            <li
              key={website.id}
              className="website-card-in min-w-0"
              style={{ animationDelay: `${Math.min(index, 10) * 55}ms` }}
            >
              <HoverGlassCard className="relative h-full min-h-[254px] w-full min-w-0 flex-col p-6 text-left font-medium">
                <Link
                  href={`/dashboard/websites/${website.id}`}
                  className="absolute inset-0 z-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  aria-label={`Open ${website.name}`}
                />
                <div className="flex w-full items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <SiteFavicon domain={website.domain} iconUrl={website.iconUrl} />
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-[var(--foreground)]">
                        {website.name}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-medium text-[var(--muted-foreground)]">
                        {website.domain}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0">
                    <Badge variant={SETUP_STATUS[website.setupStatus].variant} size="sm">
                      {SETUP_STATUS[website.setupStatus].label}
                    </Badge>
                  </span>
                </div>

                <SetupProgress status={website.setupStatus} />

                <div className="mt-auto flex w-full flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                  <span className="min-w-0">
                    <VerifiedBadge verified={website.verified} />
                  </span>
                  <span className="flex flex-wrap items-center justify-end gap-2">
                    {website.verified ? null : (
                      <Link
                        href={`/dashboard/websites/${website.id}#domain-verify`}
                        className="btn btn-secondary btn-sm relative z-10"
                      >
                        Verify
                      </Link>
                    )}
                    {website.nextAction ? (
                      <Link
                        href={website.nextAction.href}
                        className="btn btn-primary btn-sm relative z-10"
                      >
                        {website.nextAction.label}
                      </Link>
                    ) : null}
                  </span>
                </div>
              </HoverGlassCard>
            </li>
          ))}
          {websites.length <= SHOW_ADD_CARD_LIMIT ? (
          <li
            className="website-card-in min-w-0"
            style={{ animationDelay: `${Math.min(filtered.length, 10) * 55}ms` }}
          >
            <HoverGlassCard
              href="/dashboard/websites/new"
              className="h-full min-h-[254px] w-full min-w-0 flex-col items-center justify-center gap-1 p-6 text-center"
            >
              <span
                className="mb-1 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--foreground)]"
                aria-hidden="true"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 4v10M4 9h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
              <span className="text-base font-bold text-[var(--foreground)]">Add website</span>
              <span className="text-sm font-medium text-[var(--muted-foreground)]">Connect a new domain</span>
            </HoverGlassCard>
          </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
