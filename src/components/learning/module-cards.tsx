"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { StatusIcon, toModuleStatus, type ModuleStatus } from "@/components/learning/status-icon";
import { pad, primaryBtn } from "@/components/learning/ui";
import { displayModuleNumber, groupModulesByPart } from "@/lib/learning/course-parts";
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
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#4d6570]">
            Module {pad(displayModuleNumber(number))}
          </p>
          <p className="mt-2 line-clamp-3 text-sm font-semibold leading-snug text-[#0B2C4A]">{title}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full min-w-0 overflow-hidden ${className}`}>
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

function PartChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={`h-5 w-5 shrink-0 fill-none stroke-current stroke-2 text-[#0B2C4A] motion-safe:transition-transform motion-safe:duration-200 ${
        open ? "rotate-180" : ""
      }`}
    >
      <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
      const shown = displayModuleNumber(item.number);
      return (
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        String(item.number).includes(q) ||
        pad(item.number).includes(q) ||
        String(shown).includes(q) ||
        pad(shown).includes(q)
      );
    });
  }, [modules, query, filter]);

  const parts = useMemo(() => groupModulesByPart(filtered), [filtered]);
  const [openParts, setOpenParts] = useState<Record<string, boolean>>({});

  const partKey = (part: { number: number; title: string }) => String(part.number || part.title);
  const isPartOpen = (part: { number: number; title: string }) => openParts[partKey(part)] !== false;

  function togglePart(part: { number: number; title: string }) {
    const key = partKey(part);
    setOpenParts((prev) => ({ ...prev, [key]: !(prev[key] !== false) }));
  }

  return (
    <section aria-labelledby="modules-heading" className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#00A88F]">Curriculum</p>
          <h2 id="modules-heading" className="mt-1 text-2xl font-semibold tracking-tight text-[#0B2C4A]">
            Modules
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#4d6570]">
            {enrolled
              ? "Nine parts · open a lesson or jump straight to the quiz when the module is unlocked."
              : "Nine parts covering the DPDP Act and Rules. Sign in and enrol to start."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[14rem] flex-1 sm:flex-none sm:w-56">
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
              className={`inline-flex h-10 items-center justify-center rounded-xl px-3.5 text-sm font-semibold leading-none motion-safe:transition-colors ${
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
        <div className="space-y-3">
          {parts.map(({ part, modules: partModules }) => {
            const open = isPartOpen(part);
            const headingId = `part-${part.number}-heading`;
            const panelId = `part-${part.number}-panel`;
            return (
              <section
                key={part.number || part.title}
                aria-labelledby={headingId}
                className="overflow-hidden rounded-2xl bg-[#fbfdfc] ring-1 ring-[#e4eeec]"
              >
                <button
                  type="button"
                  onClick={() => togglePart(part)}
                  aria-expanded={open}
                  aria-controls={panelId}
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left motion-safe:transition-colors hover:bg-[#f3f8f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00C4A7] sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#00A88F]">
                      Part {part.number || "—"}
                    </p>
                    <h3 id={headingId} className="mt-1 text-base font-semibold leading-snug text-[#0B2C4A] sm:text-lg">
                      {part.title}
                    </h3>
                    <p className="mt-1 text-xs text-[#4d6570]">
                      {partModules.length} module{partModules.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <PartChevron open={open} />
                </button>

                <div
                  id={panelId}
                  className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-300 motion-safe:ease-out ${
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden" inert={!open} aria-hidden={open ? undefined : true}>
                    <ul className="grid items-stretch gap-5 border-t border-[#e4eeec] bg-white p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3 2xl:grid-cols-4">
                      {partModules.map((item) => {
                        const status = toModuleStatus(item.status);
                        const locked = enrolled && item.unlocked === false;
                        const current = item.slug === currentSlug;
                        const lessonHref = locked ? undefined : `/e-learning/module/${item.slug}`;
                        const quizHref = locked ? undefined : `/e-learning/module/${item.slug}/quiz`;
                        const shown = displayModuleNumber(item.number);
                        const label = `Module ${pad(shown)}: ${item.title}`;
                        const ctaClass =
                          "inline-flex h-9 w-full items-center justify-center rounded-xl px-2 text-center text-xs font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]";

                        return (
                          <li key={item.slug} className="flex h-full min-w-0 flex-col">
                            <article
                              title={label}
                              className={`relative overflow-hidden ${locked ? "opacity-80" : ""} ${
                                current ? "ring-2 ring-[#00C4A7] ring-offset-2" : ""
                              }`}
                            >
                              <ModuleThumbnail number={item.number} slug={item.slug} title={item.title} />
                              {enrolled ? (
                                <span className="absolute right-2.5 top-2.5 z-10 rounded-full bg-white/95 p-1 shadow-sm">
                                  <StatusIcon status={status} size={18} />
                                </span>
                              ) : null}
                            </article>
                            <div className="mt-2.5 flex min-h-0 flex-1 flex-col">
                              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4d6570]">
                                Module {pad(shown)}
                              </p>
                              <h4 className="mt-1 text-sm font-semibold leading-snug text-[#0B2C4A]">{item.title}</h4>
                              <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
                                {lessonHref ? (
                                  <Link
                                    href={lessonHref}
                                    prefetch={current || status === "available" || status === "in_progress"}
                                    className={`${ctaClass} bg-[#0B2C4A] text-white hover:bg-[#123a5c]`}
                                  >
                                    View module
                                  </Link>
                                ) : (
                                  <span className={`${ctaClass} border border-[#d5e3e0] bg-white text-[#8aa0a8]`}>
                                    Locked
                                  </span>
                                )}
                                {quizHref ? (
                                  <Link
                                    href={quizHref}
                                    className={`${ctaClass} border border-[#0B2C4A]/25 bg-white text-[#0B2C4A] hover:border-[#0B2C4A]`}
                                  >
                                    Take quiz
                                  </Link>
                                ) : (
                                  <span className={`${ctaClass} border border-[#d5e3e0] bg-[#f7fbfa] text-[#8aa0a8]`}>
                                    {item.prerequisiteNumber
                                      ? `Pass M${pad(displayModuleNumber(item.prerequisiteNumber))}`
                                      : "Quiz locked"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
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
  const shown = displayModuleNumber(item.number);
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-[#0B2C4A] text-white">
      <div className="relative w-full">
        <ModuleThumbnail number={item.number} slug={item.slug} title={item.title} overlay showPlay />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">Module {pad(shown)}</p>
          <p className="mt-2 line-clamp-2 text-lg font-semibold leading-snug">{item.title}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <p className="line-clamp-2 min-h-[3rem] text-sm leading-6 text-white/80">{item.summary}</p>
        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/65">{item.minutes} minutes</p>
            <p className="text-sm font-semibold">{STATUS_FOOTER[status]}</p>
          </div>
          {locked ? (
            <span className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/25 px-4 text-sm font-semibold leading-none text-white/55">
              Locked
            </span>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/e-learning/module/${item.slug}`}
                prefetch
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#00C4A7] px-3 text-sm font-semibold leading-none text-[#0B2C4A] transition-colors hover:bg-[#7FE8D6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                View module
              </Link>
              <Link
                href={`/e-learning/module/${item.slug}/quiz`}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/40 bg-transparent px-3 text-sm font-semibold leading-none text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Take quiz
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
