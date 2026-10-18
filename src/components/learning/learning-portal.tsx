"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { StatusIcon, toModuleStatus } from "@/components/learning/status-icon";
import { pad } from "@/components/learning/ui";

export type PortalModule = {
  number: number;
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  status?: string;
  unlocked?: boolean;
};

export type PortalProgress = {
  completedModules: number;
  totalModules: number;
  completionPercentage: number;
  examPassed: boolean;
  examPercentage: number | null;
  certificateEligible: boolean;
};

type Props = {
  children: ReactNode;
  signedIn: boolean;
  enrolled: boolean;
  modules: PortalModule[];
  progress?: PortalProgress | null;
  courseTitle: string;
};

function ProgressRing({ value }: { value: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;
  return (
    <div className="relative mx-auto h-24 w-24" aria-hidden="true">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#e6eef0" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="#00C4A7"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold tabular-nums text-[#0B2C4A]">{Math.round(value)}%</span>
      </div>
    </div>
  );
}

function MiniBars({ modules }: { modules: PortalModule[] }) {
  const recent = useMemo(() => {
    const done = modules.filter((item) => toModuleStatus(item.status) === "completed").slice(-5);
    if (done.length > 0) return done;
    return modules.slice(0, 5);
  }, [modules]);

  return (
    <div className="flex h-16 items-end gap-1.5" aria-hidden="true">
      {recent.map((item) => {
        const done = toModuleStatus(item.status) === "completed";
        const height = done ? 90 : item.status === "in_progress" ? 55 : 28;
        return (
          <div key={item.slug} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div
              className={`w-full rounded-t-md ${done ? "bg-[#00C4A7]" : "bg-[#c5d6d2]"}`}
              style={{ height: `${height}%` }}
            />
            <span className="text-[9px] font-semibold tabular-nums text-[#4d6570]">M{pad(item.number)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function LearningPortal({ children, signedIn, enrolled, modules, progress, courseTitle }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname.startsWith("/e-learning/sign-in") || pathname.startsWith("/e-learning/sign-up")) {
    return children;
  }

  if (!signedIn) {
    return (
      <div className="min-h-screen bg-[#f3f7f6] text-[#0B2C4A]">
        <header className="border-b border-[#e4eeec] bg-white">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <Link href="/e-learning" className="inline-flex items-center gap-2">
              <BrandLogo height={28} />
            </Link>
            <a
              href="/e-learning/sign-in"
              className="inline-flex h-10 items-center rounded-xl bg-[#0B2C4A] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#123a5c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]"
            >
              Log in
            </a>
          </div>
        </header>
        <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
          {children}
        </main>
      </div>
    );
  }

  const done = progress?.completedModules ?? 0;
  const total = progress?.totalModules ?? modules.length;
  const left = Math.max(0, total - done);
  const percent = progress?.completionPercentage ?? 0;
  const dashboardActive = pathname === "/e-learning";
  const examActive = pathname.startsWith("/e-learning/final-exam");
  const examUnlocked = enrolled && done >= total && total > 0;
  const examStatus = progress?.examPassed ? "completed" : examUnlocked ? "available" : "locked";

  const sidebar = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[#e4eeec] px-4 py-4">
        <Link href="/e-learning" className="inline-flex items-center gap-2" onClick={() => setOpen(false)}>
          <BrandLogo height={28} />
        </Link>
        <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#4d6570]">DPDP learning portal</p>
        <Link
          href="/e-learning"
          onClick={() => setOpen(false)}
          className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold motion-safe:transition-colors ${
            dashboardActive ? "bg-[#E6F9F5] text-[#0B2C4A]" : "text-[#36505c] hover:bg-[#f3f8f7]"
          }`}
        >
          Dashboard
        </Link>
      </div>

      <div className="mx-3 mt-4 shrink-0 rounded-2xl border border-[#e4eeec] bg-[#fbfdfc] p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4d6570]">Overall progress</p>
        <div className="mt-3">
          <ProgressRing value={enrolled ? percent : 0} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white px-3 py-2 text-center shadow-sm ring-1 ring-[#e4eeec]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#4d6570]">Done</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-[#0B2C4A]">{enrolled ? done : 0}</p>
          </div>
          <div className="rounded-xl bg-white px-3 py-2 text-center shadow-sm ring-1 ring-[#e4eeec]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#4d6570]">Left</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-[#0B2C4A]">{enrolled ? left : total}</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#4d6570]">Recent modules</p>
          <MiniBars modules={modules} />
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col px-3 pb-2">
        <p className="shrink-0 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#4d6570]">Curriculum</p>
        <ol className="lesson-scroll mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
          {modules.map((item) => {
            const status = toModuleStatus(item.status);
            const href = item.unlocked === false ? "/e-learning" : `/e-learning/module/${item.slug}`;
            const active = pathname.includes(`/module/${item.slug}`);
            return (
              <li key={item.slug}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm motion-safe:transition-colors ${
                    active ? "bg-[#E6F9F5] font-semibold text-[#0B2C4A]" : "text-[#36505c] hover:bg-[#f3f8f7]"
                  }`}
                >
                  {enrolled ? <StatusIcon status={status} size={16} /> : <span className="w-4 text-[10px] font-bold tabular-nums text-[#8aa0a8]">{pad(item.number)}</span>}
                  <span className="min-w-0 flex-1 truncate">Module {pad(item.number)}</span>
                </Link>
              </li>
            );
          })}
          <li className="pt-1">
            {examUnlocked ? (
              <Link
                href="/e-learning/final-exam"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-2 py-2.5 text-left text-sm font-semibold motion-safe:transition-colors ${
                  examActive ? "bg-[#E6F9F5] text-[#0B2C4A]" : "text-[#0B2C4A] hover:bg-[#f3f8f7]"
                }`}
              >
                {enrolled ? <StatusIcon status={examStatus} size={16} /> : null}
                <span className="min-w-0 flex-1">Final exam</span>
              </Link>
            ) : (
              <div
                className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-left text-sm text-[#8aa0a8]"
                aria-disabled="true"
                title="Complete all modules to unlock the final exam"
              >
                {enrolled ? <StatusIcon status="locked" size={16} /> : null}
                <span className="min-w-0 flex-1 font-semibold">Final exam</span>
              </div>
            )}
          </li>
        </ol>
      </div>

      <div className="shrink-0 space-y-2 border-t border-[#e4eeec] px-4 py-3">
        <p className="truncate text-xs font-medium text-[#4d6570]">{courseTitle}</p>
        {signedIn ? (
          <form action="/api/learning/sign-out" method="post" className="w-full">
            <button
              type="submit"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-[#d5e3e0] bg-white text-sm font-semibold text-[#0B2C4A] transition-colors hover:border-[#0B2C4A] hover:bg-[#f7fbfa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]"
            >
              Log out
            </button>
          </form>
        ) : (
          <Link
            href="/e-learning/sign-in"
            onClick={() => setOpen(false)}
            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#0B2C4A] text-sm font-semibold text-white transition-colors hover:bg-[#123a5c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]"
          >
            Log in
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3f7f6] text-[#0B2C4A]">
      <div className="flex min-h-screen w-full">
        <aside className="sticky top-0 hidden h-screen w-[17.5rem] shrink-0 border-r border-[#e4eeec] bg-white lg:block xl:w-[19rem]">
          {sidebar}
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#e4eeec] bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
            <button
              type="button"
              className="inline-flex h-10 items-center rounded-xl border border-[#d5e3e0] bg-white px-3 text-sm font-semibold"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="learning-sidebar"
            >
              Menu
            </button>
            <Link href="/e-learning" className="font-semibold">
              DPDP training
            </Link>
            <span className="text-sm font-semibold tabular-nums text-[#4d6570]">{enrolled ? `${done}/${total}` : "—"}</span>
          </header>

          {open ? (
            <div className="fixed inset-0 z-40 lg:hidden">
              <button type="button" className="absolute inset-0 bg-[#0B2C4A]/35" aria-label="Close menu" onClick={() => setOpen(false)} />
              <aside id="learning-sidebar" className="absolute inset-y-0 left-0 w-[18rem] max-w-[85vw] bg-white shadow-xl">
                {sidebar}
              </aside>
            </div>
          ) : null}

          <main id="main-content" className="w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7 xl:px-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
