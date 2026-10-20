"use client";

import { useEffect, useRef, useState } from "react";

import { pad } from "@/components/learning/ui";

export function GuestModuleOutline({
  modules,
}: {
  modules: { number: number; slug: string; title: string; summary: string }[];
}) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());

  useEffect(() => {
    if (!openSlug) return;
    const row = rows.current.get(openSlug);
    if (!row) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
  }, [openSlug]);

  return (
    <section aria-labelledby="modules-heading" className="rounded-3xl border border-[#e4eeec] bg-white p-6 sm:p-8">
      <h2 id="modules-heading" className="text-xl font-semibold text-[#0B2C4A]">
        Modules
      </h2>
      <ul className="mt-4">
        {modules.map((item) => {
          const open = openSlug === item.slug;
          return (
            <li
              key={item.slug}
              ref={(node) => {
                if (node) rows.current.set(item.slug, node);
                else rows.current.delete(item.slug);
              }}
              className="border-b border-[#eef4f3] last:border-b-0"
            >
              <div className="flex items-center gap-3 py-2.5">
                <span className="w-8 shrink-0 text-sm tabular-nums text-[#4d6570]">{pad(item.number)}</span>
                <span className="min-w-0 flex-1 text-sm font-semibold leading-6 text-[#0B2C4A]">{item.title}</span>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`module-about-${item.slug}`}
                  aria-label={`${open ? "Hide" : "Show"} details for ${item.title}`}
                  onClick={() => setOpenSlug(open ? null : item.slug)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d5e3e0] bg-white text-[#0B2C4A] hover:border-[#0B2C4A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]"
                >
                  <svg
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                    className={`h-5 w-5 fill-none stroke-current stroke-2 motion-safe:transition-transform motion-safe:duration-300 ${open ? "rotate-90" : ""}`}
                  >
                    <path d="M7.5 4.5 13 10l-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              <div
                id={`module-about-${item.slug}`}
                className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-300 motion-safe:ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
              >
                <div className="overflow-hidden" inert={!open} aria-hidden={open ? undefined : true}>
                  <p className="pb-3 pl-11 pr-12 text-justify text-sm leading-6 text-[#36505c]">{item.summary}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
