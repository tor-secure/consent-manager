"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="6" fill="#10b981" />
          <path d="M4 7l2 2 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="6" stroke="#cbd5e1" strokeWidth="1.4" fill="none" />
        <path d="M4.5 7h5" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" />
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
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search websites…"
            className="w-full h-12 rounded-2xl bg-white soft-shadow pl-12 pr-4 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-all focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
      )}

      {websites.length === 0 && (
        <div className="rounded-3xl card-shadow bg-white p-10 md:p-14 text-center border-2 border-dashed border-slate-200 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 opacity-60 blur-2xl" />
          <div className="relative flex flex-col items-center">
            <div className="h-14 w-14 rounded-2xl stat-icon-blue flex items-center justify-center mb-5 shadow-md shadow-indigo-500/20">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <path d="M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-slate-800">No websites yet</p>
            <p className="mt-2 text-sm text-slate-500 max-w-sm">
              Add your first website to start configuring consent management and unlock analytics.
            </p>
            <Link href="/dashboard/websites/new" className="mt-7">
              <Button variant="primary" size="lg">
                Add your first website
              </Button>
            </Link>
          </div>
        </div>
      )}

      {websites.length > 0 && filtered.length === 0 && (
        <div className="rounded-3xl card-shadow bg-white p-10 text-center border-2 border-dashed border-slate-200">
          <p className="text-sm font-medium text-slate-700">
            No websites match &ldquo;<span className="text-slate-900">{query}</span>&rdquo;
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-3 text-sm text-indigo-600 font-medium hover:text-indigo-700 underline underline-offset-4"
          >
            Clear search
          </button>
        </div>
      )}

      {filtered.length > 0 && (
        <ul role="list" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((website) => (
            <li key={website.id}>
              <Link
                href={`/dashboard/websites/${website.id}`}
                className="group flex h-full flex-col rounded-2xl bg-white card-shadow p-6 transition-all duration-200 card-shadow-hover"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {website.name}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {website.domain}
                    </p>
                  </div>
                  <StatusBadge status={website.status} />
                </div>

                <dl className="mt-5 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400 font-medium">Environment</dt>
                    <dd className="capitalize text-slate-700">
                      {website.environment}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400 font-medium">Region</dt>
                    <dd className="text-slate-700">
                      {website.defaultRegion ?? "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400 font-medium">Language</dt>
                    <dd className="uppercase tracking-wide text-slate-700">
                      {website.defaultLanguage}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 pt-4 border-t border-slate-100">
                  <VerifiedBadge verified={website.verified} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
