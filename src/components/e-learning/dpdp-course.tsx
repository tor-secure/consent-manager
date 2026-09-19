"use client";

import { useEffect, useMemo, useState } from "react";
import { DPDP_MODULES } from "@/content/dpdp-modules";

const STORAGE_KEY = "consent-guru-dpdp-elearning-v1";

type Progress = {
  completed: string[];
  activeId: string;
};

function loadProgress(): Progress {
  const firstId = DPDP_MODULES[0]?.id ?? "01-what-is-dpdp";
  if (typeof window === "undefined") {
    return { completed: [], activeId: firstId };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completed: [], activeId: firstId };
    const parsed = JSON.parse(raw) as Partial<Progress>;
    const completed = Array.isArray(parsed.completed)
      ? parsed.completed.filter((id): id is string => typeof id === "string")
      : [];
    const activeId =
      typeof parsed.activeId === "string" && DPDP_MODULES.some((mod) => mod.id === parsed.activeId)
        ? parsed.activeId
        : firstId;
    return { completed, activeId };
  } catch {
    return { completed: [], activeId: firstId };
  }
}

export function DpdpCourse() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProgress(loadProgress());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [hydrated, progress]);

  const active = useMemo(
    () => DPDP_MODULES.find((mod) => mod.id === progress.activeId) ?? DPDP_MODULES[0],
    [progress.activeId],
  );

  const completedCount = progress.completed.length;
  const percent = Math.round((completedCount / DPDP_MODULES.length) * 100);

  function markComplete() {
    if (!active) return;
    setProgress((current) => {
      const completed = current.completed.includes(active.id)
        ? current.completed
        : [...current.completed, active.id];
      const currentIndex = DPDP_MODULES.findIndex((mod) => mod.id === active.id);
      const next = DPDP_MODULES[currentIndex + 1];
      return {
        completed,
        activeId: next?.id ?? active.id,
      };
    });
  }

  if (!active) return null;

  return (
    <div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-5 sm:px-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:py-8">
      <aside className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#00C4A7]">DPDP Act</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#111827]">E-learning</h1>
        <p className="mt-2 text-sm leading-6 text-[#4B5563]">
          Ten modules on the Digital Personal Data Protection Act. Progress is stored in this browser
          only.
        </p>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold text-[#0B2C4A]">
            <span>
              {completedCount} / {DPDP_MODULES.length} complete
            </span>
            <span>{percent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
            <div className="h-full rounded-full bg-[#00C4A7]" style={{ width: `${percent}%` }} />
          </div>
        </div>
        <ol className="mt-5 space-y-1.5">
          {DPDP_MODULES.map((mod, index) => {
            const done = progress.completed.includes(mod.id);
            const selected = mod.id === active.id;
            return (
              <li key={mod.id}>
                <button
                  type="button"
                  onClick={() => setProgress((current) => ({ ...current, activeId: mod.id }))}
                  className={`flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    selected ? "bg-[#E6F9F5] font-semibold text-[#0B2C4A]" : "text-[#374151] hover:bg-[#F9FAFB]"
                  }`}
                >
                  <span
                    className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                      done ? "bg-[#00C4A7] text-white" : "bg-[#F3F4F6] text-[#6B7280]"
                    }`}
                  >
                    {done ? "✓" : index + 1}
                  </span>
                  <span>{mod.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      <article className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
          Module · {active.minutes} min
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">{active.title}</h2>
        <p className="mt-3 text-[15px] leading-7 text-[#4B5563]">{active.summary}</p>
        <div className="mt-6 space-y-4">
          {active.body.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="text-[16px] leading-8 text-[#374151]">
              {paragraph}
            </p>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={markComplete}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#0B2C4A] px-5 text-sm font-semibold text-white transition hover:bg-[#00C4A7]"
          >
            {progress.completed.includes(active.id) ? "Completed — next module" : "Mark complete"}
          </button>
          {progress.completed.length > 0 ? (
            <button
              type="button"
              onClick={() =>
                setProgress({
                  completed: [],
                  activeId: DPDP_MODULES[0]?.id ?? progress.activeId,
                })
              }
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#E5E7EB] px-5 text-sm font-semibold text-[#374151]"
            >
              Reset local progress
            </button>
          ) : null}
        </div>
      </article>
    </div>
  );
}
