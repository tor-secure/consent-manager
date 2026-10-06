"use client";

import Link from "next/link";
import { useState } from "react";

import { StatusChip, StatusIcon, toModuleStatus } from "@/components/learning/status-icon";
import { pad, secondaryBtn } from "@/components/learning/ui";

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
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const enrolled = modules.some((item) => item.status !== undefined);

  return (
    <ol className="grid gap-2">
      {modules.map((item) => {
        const open = openSlug === item.slug;
        const status = toModuleStatus(item.status);
        const current = item.slug === currentSlug;
        const panelId = `module-panel-${item.slug}`;
        return (
          <li
            key={item.slug}
            className={`overflow-hidden rounded-xl border bg-white text-[#0B2C4A] motion-safe:transition-colors ${
              current ? "border-[#00C4A7] shadow-[inset_3px_0_0_#00C4A7]" : "border-[#d5e3e0] hover:border-[#b9cfcb]"
            }`}
          >
            <div className="flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
              <button
                type="button"
                className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenSlug(open ? null : item.slug)}
              >
                {enrolled ? <StatusIcon status={status} /> : null}
                <span className="w-7 shrink-0 text-sm font-semibold tabular-nums text-[#4d6570]">{pad(item.number)}</span>
                <h3 className="min-w-0 flex-1 text-[15px] font-semibold leading-6 text-[#0B2C4A] sm:text-base">{item.title}</h3>
                <span className="hidden shrink-0 text-sm text-[#4d6570] sm:inline">{item.minutes} min</span>
                <svg
                  viewBox="0 0 20 20"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                  className={`shrink-0 text-[#4d6570] motion-safe:transition-transform ${open ? "rotate-180" : ""}`}
                >
                  <path d="M5 7.5 10 12.5 15 7.5" />
                </svg>
              </button>
              {item.unlocked ? (
                <Link href={`/e-learning/module/${item.slug}`} className={`${secondaryBtn} hidden px-4 sm:inline-flex`}>
                  {status === "completed" ? "Review" : current ? "Resume" : "Start"}
                </Link>
              ) : null}
            </div>
            {open ? (
              <div id={panelId} className="border-t border-[#d5e3e0] bg-[#fbfdfc] px-4 py-4 sm:pl-[4.75rem]">
                {enrolled ? (
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <StatusChip status={status} />
                    {status === "locked" && item.prerequisiteNumber ? (
                      <span className="text-sm text-[#4d6570]">Pass the Module {item.prerequisiteNumber} quiz to unlock.</span>
                    ) : null}
                  </div>
                ) : null}
                <p className="line-clamp-5 max-w-3xl text-justify text-sm leading-6 text-[#0B2C4A]">{item.summary}</p>
                <p className="mt-3 text-sm text-[#4d6570]">{item.minutes} minutes · video, lesson, and quiz</p>
                {item.unlocked ? (
                  <Link href={`/e-learning/module/${item.slug}`} className={`${secondaryBtn} mt-3 sm:hidden`}>
                    {status === "completed" ? "Review module" : "Open module"}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
