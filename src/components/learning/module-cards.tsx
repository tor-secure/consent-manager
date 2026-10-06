"use client";

import Link from "next/link";
import { useState } from "react";

import { LockMark } from "@/components/learning/lock-mark";

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

const STATUS_LABEL = {
  available: "Available",
  in_progress: "In progress",
  completed: "Completed",
} as const;

export function ModuleCards({ modules }: { modules: ModuleCard[] }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  return (
    <ol className="grid gap-3">
      {modules.map((item) => {
        const open = openSlug === item.slug;
        const statusLine =
          item.status === "available" || item.status === "in_progress" || item.status === "completed"
            ? STATUS_LABEL[item.status]
            : item.status === "locked"
              ? `Complete module ${item.prerequisiteNumber} to unlock`
              : null;
        return (
          <li key={item.slug} className="overflow-hidden rounded-xl border border-[#d5e3e0] bg-white text-[#0B2C4A]">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <button
                type="button"
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                aria-expanded={open}
                onClick={() => setOpenSlug(open ? null : item.slug)}
              >
                <span className="w-8 shrink-0 text-sm font-semibold tabular-nums text-[#4d6570]">
                  {String(item.number).padStart(2, "0")}
                </span>
                <h2 className="min-w-0 flex-1 text-base font-semibold leading-6 text-[#0B2C4A]">{item.title}</h2>
                <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className={`shrink-0 ${open ? "rotate-180" : ""}`}>
                  <path d="M5 7.5 10 12.5 15 7.5" />
                </svg>
              </button>
              {item.unlocked === false ? <LockMark /> : null}
              {item.unlocked ? (
                <Link
                  href={`/e-learning/module/${item.slug}`}
                  className="inline-flex h-10 shrink-0 items-center rounded-lg border border-[#0B2C4A] px-3 text-sm font-semibold text-[#0B2C4A]"
                >
                  {item.status === "completed" ? "Review" : "Continue"}
                </Link>
              ) : null}
            </div>
            {open ? (
              <div className="border-t border-[#d5e3e0] px-4 py-4 sm:pl-[3.75rem] sm:pr-4">
                <p className="line-clamp-5 text-justify text-sm leading-6 text-[#0B2C4A]">{item.summary}</p>
                <p className="mt-3 text-sm text-[#4d6570]">
                  {item.minutes} minutes{statusLine ? ` · ${statusLine}` : ""}
                </p>
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
