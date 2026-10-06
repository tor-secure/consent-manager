import Link from "next/link";

import { ProgressBar } from "@/components/learning/progress-bar";
import { StatusIcon, STATUS_TEXT, toModuleStatus } from "@/components/learning/status-icon";
import { pad } from "@/components/learning/ui";

export type NavModule = {
  number: number;
  slug: string;
  title: string;
  status?: string;
  unlocked?: boolean;
};

function ModuleList({ modules, currentSlug }: { modules: NavModule[]; currentSlug: string }) {
  return (
    <ol className="space-y-0.5">
      {modules.map((item) => {
        const status = toModuleStatus(item.status);
        const current = item.slug === currentSlug;
        const row = (
          <>
            <StatusIcon status={status} size={20} />
            <span className="w-6 shrink-0 text-xs font-semibold tabular-nums text-[#4d6570]">{pad(item.number)}</span>
            <span className="min-w-0 flex-1 text-sm leading-5">{item.title}</span>
          </>
        );
        const base = "flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2";
        return (
          <li key={item.slug}>
            {item.unlocked === false ? (
              <span className={`${base} text-[#4d6570]`} aria-label={`Module ${item.number}: ${item.title}. ${STATUS_TEXT.locked}`}>
                {row}
              </span>
            ) : (
              <Link
                href={`/e-learning/module/${item.slug}`}
                aria-current={current ? "page" : undefined}
                className={`${base} text-[#0B2C4A] motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7] ${
                  current ? "bg-[#E6F9F5] font-semibold shadow-[inset_3px_0_0_#00C4A7]" : "hover:bg-[#f3f7f6]"
                }`}
              >
                {row}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function ModuleNav({
  modules,
  currentSlug,
  completed,
  total,
  percentage,
}: {
  modules: NavModule[];
  currentSlug: string;
  completed: number;
  total: number;
  percentage: number;
}) {
  const summary = (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-[#0B2C4A]">
        Course progress · {completed} / {total} modules
      </p>
      <ProgressBar value={percentage} label="Course completion" size="sm" />
    </div>
  );
  return (
    <>
      <details className="group rounded-xl border border-[#d5e3e0] bg-white lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[#0B2C4A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7] [&::-webkit-details-marker]:hidden">
          <span>
            Course modules ({completed}/{total})
          </span>
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="motion-safe:transition-transform group-open:rotate-180">
            <path d="M5 7.5 10 12.5 15 7.5" />
          </svg>
        </summary>
        <div className="space-y-3 border-t border-[#d5e3e0] px-2 py-3">
          <div className="px-2">{summary}</div>
          <ModuleList modules={modules} currentSlug={currentSlug} />
        </div>
      </details>
      <aside aria-label="Course modules" className="hidden lg:block">
        <div className="sticky top-24 flex max-h-[calc(100vh-7rem)] flex-col rounded-xl border border-[#d5e3e0] bg-white">
          <div className="border-b border-[#d5e3e0] p-4">{summary}</div>
          <nav aria-label="Modules" className="min-h-0 flex-1 overflow-y-auto p-2">
            <ModuleList modules={modules} currentSlug={currentSlug} />
          </nav>
        </div>
      </aside>
    </>
  );
}
