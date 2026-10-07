"use client";

import Link from "next/link";
import { useState } from "react";

import { StatusChip, StatusIcon, toModuleStatus } from "@/components/learning/status-icon";
import { pad, primaryBtn } from "@/components/learning/ui";

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

export function ModuleCards({ modules, currentSlug }: { modules: ModuleCard[]; currentSlug?: string | null }) {
  const enrolled = modules.some((item) => item.status !== undefined);
  const initial = modules.find((item) => item.slug === currentSlug)?.slug ?? modules[0]?.slug ?? null;
  const [selectedSlug, setSelectedSlug] = useState(initial);
  const selected = modules.find((item) => item.slug === selectedSlug) ?? modules[0];

  if (!selected) return null;

  const selectedStatus = toModuleStatus(selected.status);
  const selectedCurrent = selected.slug === currentSlug;
  const action = selectedStatus === "completed" ? "Review" : selectedCurrent ? "Resume" : "Start";

  return (
    <div className="grid gap-4 lg:h-[calc(100dvh-18rem)] lg:min-h-[32rem] lg:grid-cols-[minmax(18rem,0.9fr)_minmax(0,1.1fr)]">
      <ol className="lesson-scroll max-h-80 overflow-y-auto rounded-xl border border-[#d5e3e0] bg-white lg:h-full lg:max-h-none lg:min-h-0" aria-label="Modules">
        {modules.map((item) => {
          const status = toModuleStatus(item.status);
          const selectedItem = item.slug === selected.slug;
          const locked = enrolled && item.unlocked === false;
          return (
            <li key={item.slug} className="border-b border-[#d5e3e0] last:border-b-0">
              <button
                type="button"
                aria-pressed={selectedItem}
                onClick={() => setSelectedSlug(item.slug)}
                className={`flex w-full items-center gap-3 px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00C4A7] ${
                  selectedItem ? "bg-[#E6F9F5]" : "hover:bg-[#f7fbfa]"
                }`}
              >
                {enrolled ? <StatusIcon status={status} size={20} /> : null}
                <span className="w-6 shrink-0 text-xs font-semibold tabular-nums text-[#4d6570]">{pad(item.number)}</span>
                <span className={`min-w-0 flex-1 truncate text-sm leading-5 ${locked ? "text-[#4d6570]" : "text-[#0B2C4A]"} ${selectedItem ? "font-semibold" : ""}`}>
                  {item.title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <article className="lesson-scroll flex min-h-0 flex-col overflow-y-auto rounded-xl border border-[#d5e3e0] bg-white p-5 text-[#0B2C4A] sm:p-6 lg:h-full">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#eef6f4] px-2 text-sm font-semibold tabular-nums">
            {pad(selected.number)}
          </span>
          {enrolled ? <StatusChip status={selectedStatus} /> : <span className="text-sm text-[#4d6570]">{selected.minutes} min</span>}
        </div>
        <h3 className="mt-4 text-xl font-semibold leading-snug">{selected.title}</h3>
        <p className="mt-3 text-sm leading-6 text-[#4d6570]">{selected.summary}</p>
        <div className="mt-auto pt-6">
          {enrolled ? <p className="text-sm text-[#4d6570]">{selected.minutes} minutes</p> : null}
          {selected.unlocked ? (
            <Link href={`/e-learning/module/${selected.slug}`} prefetch className={`${primaryBtn} mt-4`}>
              {action}
            </Link>
          ) : enrolled ? (
            <p className="mt-4 text-sm text-[#4d6570]">
              {selected.prerequisiteNumber ? `Pass Module ${selected.prerequisiteNumber} to unlock this module.` : "This module is locked."}
            </p>
          ) : null}
        </div>
      </article>
    </div>
  );
}
