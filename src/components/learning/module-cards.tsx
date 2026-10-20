"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { StatusIcon, toModuleStatus, type ModuleStatus } from "@/components/learning/status-icon";
import { pad, primaryBtn, secondaryBtn } from "@/components/learning/ui";
import { moduleCardImageUrl } from "@/lib/learning/module-videos";

type ModuleCard = {
  number: number;
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  status?: string;
  unlocked?: boolean;
  prerequisiteNumber?: number | null;
};

type Filter = "all" | "done" | "todo";

const STATUS_FOOTER: Record<ModuleStatus, string> = {
  completed: "Mastered",
  in_progress: "In progress",
  available: "Ready",
  locked: "Locked",
};

function accentFor(status: ModuleStatus) {
  if (status === "completed") return "bg-[#00C4A7]";
  if (status === "in_progress") return "bg-[#0B2C4A]";
  if (status === "locked") return "bg-[#c5d6d2]";
  return "bg-[#7eb8ad]";
}

function ModuleThumbnail({
  number,
  slug,
  title,
  className = "",
  overlay,
  showPlay = false,
}: {
  number: number;
  slug: string;
  title: string;
  className?: string;
  overlay?: boolean;
  showPlay?: boolean;
}) {
  const src = moduleCardImageUrl(number, slug);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex aspect-video w-full items-center justify-center overflow-hidden bg-[linear-gradient(145deg,#E6F9F5_0%,#f3f7f6_55%,#dcecea_100%)] ${className}`}
      >
        <div className="px-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#4d6570]">Module {pad(number)}</p>
          <p className="mt-2 line-clamp-3 text-sm font-semibold leading-snug text-[#0B2C4A]">{title}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full min-w-0 overflow-hidden bg-[#E6F9F5] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- local /public module art */}
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        width={1280}
        height={720}
        className="block h-auto w-full max-w-none"
        onError={() => setFailed(true)}
      />
      {overlay ? (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B2C4A]/85 via-[#0B2C4A]/20 to-transparent"
          aria-hidden="true"
        />
      ) : null}
      {showPlay ? (
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white shadow-lg ring-2 ring-white/35"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M8 5.5v13l11-6.5-11-6.5Z" />
          </svg>
        </span>
      ) : null}
    </div>
  );
}

export function ModuleCards({ modules, currentSlug }: { modules: ModuleCard[]; currentSlug?: string | null }) {
  const enrolled = modules.some((item) => item.status !== undefined);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return modules.filter((item) => {
      const status = toModuleStatus(item.status);
      if (filter === "done" && status !== "completed") return false;
      if (filter === "todo" && status === "completed") return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        String(item.number).includes(q) ||
        pad(item.number).includes(q)
      );
    });
  }, [modules, query, filter]);

  return (
    <section aria-labelledby="modules-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="modules-heading" className="text-xl font-semibold text-[#0B2C4A]">
            Modules
          </h2>
          <p className="mt-1 text-sm text-[#4d6570]">
            {enrolled ? "Pass each quiz to unlock the next module." : "Sign in and enrol to start the course."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[14rem] flex-1 sm:flex-none">
            <span className="sr-only">Search modules</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search modules…"
              className="h-10 w-full rounded-xl border border-[#d5e3e0] bg-white px-3 text-sm text-[#0B2C4A] outline-none ring-[#00C4A7] placeholder:text-[#8aa0a8] focus:ring-2"
            />
          </label>
          {(
            [
              ["all", "All"],
              ["done", "Done"],
              ["todo", "To do"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`h-10 rounded-xl px-3 text-sm font-semibold motion-safe:transition-colors ${
                filter === value
                  ? "bg-[#0B2C4A] text-white"
                  : "border border-[#d5e3e0] bg-white text-[#0B2C4A] hover:border-[#0B2C4A]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#d5e3e0] bg-white px-4 py-10 text-center text-sm text-[#4d6570]">
          No modules match this search.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((item) => {
            const status = toModuleStatus(item.status);
            const locked = enrolled && item.unlocked === false;
            const current = item.slug === currentSlug;
            const href = locked ? undefined : `/e-learning/module/${item.slug}`;
            const action =
              status === "completed" ? "Review" : current ? "Continue" : status === "locked" ? "Locked" : "Start";

            const card = (
              <article
                className={`group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-[0_10px_30px_-24px_rgba(11,44,74,0.45)] motion-safe:transition-transform motion-safe:duration-200 ${
                  current ? "border-[#00C4A7]" : "border-[#e4eeec]"
                } ${locked ? "opacity-80" : "hover:-translate-y-0.5"}`}
              >
                <div className="relative w-full shrink-0">
                  <ModuleThumbnail number={item.number} slug={item.slug} title={item.title} />
                  <div className={`absolute inset-x-0 top-0 h-1 ${accentFor(status)}`} aria-hidden="true" />
                  {enrolled ? (
                    <span className="absolute right-2.5 top-2.5 z-10 rounded-full bg-white/95 p-1 shadow-sm">
                      <StatusIcon status={status} size={18} />
                    </span>
                  ) : null}
                </div>

                <div className="flex min-w-0 flex-1 flex-col p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#4d6570]">Module {pad(item.number)}</p>
                  <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-[#0B2C4A]">{item.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#4d6570]">{item.summary}</p>

                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#eef4f3] pt-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#0B2C4A]">
                      {enrolled ? STATUS_FOOTER[status] : `${item.minutes} min`}
                      {status === "completed" ? <StatusIcon status="completed" size={14} /> : null}
                    </span>
                    {!locked && href ? (
                      <span className="text-xs font-semibold text-[#00C4A7] group-hover:underline">{action} →</span>
                    ) : locked ? (
                      <span className="text-xs font-semibold text-[#8aa0a8]">
                        {item.prerequisiteNumber ? `Pass M${pad(item.prerequisiteNumber)}` : "Locked"}
                      </span>
                    ) : null}
                  </div>
                </div>
              </article>
            );

            return (
              <li key={item.slug}>
                {href ? (
                  <Link href={href} prefetch={current || status === "available" || status === "in_progress"} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7] focus-visible:ring-offset-2">
                    {card}
                  </Link>
                ) : (
                  card
                )}
              </li>
            );
          })}
        </ul>
      )}

      {currentSlug ? (
        <div className="flex justify-end pt-1">
          <Link href={`/e-learning/module/${currentSlug}`} className={primaryBtn}>
            Continue current module
          </Link>
        </div>
      ) : null}
    </section>
  );
}

export function FeaturedModuleCard({
  module: item,
  enrolled,
}: {
  module: ModuleCard;
  enrolled: boolean;
}) {
  const status = toModuleStatus(item.status);
  const locked = enrolled && item.unlocked === false;
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#e4eeec] bg-white shadow-[0_18px_40px_-28px_rgba(11,44,74,0.5)]">
      <div className="relative w-full">
        <ModuleThumbnail number={item.number} slug={item.slug} title={item.title} overlay showPlay />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">Module {pad(item.number)}</p>
          <p className="mt-2 line-clamp-2 text-lg font-semibold leading-snug">{item.title}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-white/85">{item.summary}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#4d6570]">{item.minutes} minutes</p>
          <p className="mt-0.5 text-sm font-semibold text-[#0B2C4A]">{STATUS_FOOTER[status]}</p>
        </div>
        {locked ? (
          <span className={`${secondaryBtn} pointer-events-none opacity-60`}>Locked</span>
        ) : (
          <Link href={`/e-learning/module/${item.slug}`} prefetch className={primaryBtn}>
            {status === "completed" ? "Review" : status === "in_progress" ? "Continue" : "Start"}
          </Link>
        )}
      </div>
    </div>
  );
}
