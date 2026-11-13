"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { StatusIcon, toModuleStatus } from "@/components/learning/status-icon";
import { pad } from "@/components/learning/ui";
import { displayModuleNumber, groupModulesByPart } from "@/lib/learning/course-parts";

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

const SIDEBAR_PREF_KEY = "cg-learning-sidebar";
const EXPANDED_WIDTH = "w-[20rem]";
const COLLAPSED_WIDTH = "w-[4.5rem]";

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

function CompactRing({ value, size = 36 }: { value: number; size?: number }) {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const pct = clampPercent(value);
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="#e6eef0" strokeWidth="3.5" />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="#00C4A7"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold tabular-nums text-[#0B2C4A]">
        {Math.round(pct)}
      </span>
    </div>
  );
}

function SidebarProgress({
  enrolled,
  done,
  total,
  percent,
  examUnlocked,
  examPassed,
  certificateEligible,
  onCloseMobile,
}: {
  enrolled: boolean;
  done: number;
  total: number;
  percent: number;
  examUnlocked: boolean;
  examPassed: boolean;
  certificateEligible: boolean;
  onCloseMobile: () => void;
}) {
  const shownPercent = enrolled ? clampPercent(percent) : 0;
  const shownDone = enrolled ? done : 0;

  let nextStep: { href: string; label: string } | null = null;
  if (enrolled && certificateEligible) {
    nextStep = { href: "/e-learning/certificate", label: "Certificate ready — view" };
  } else if (enrolled && examUnlocked && !examPassed) {
    nextStep = { href: "/e-learning/final-exam", label: "Final exam ready — start" };
  } else if (enrolled && examPassed && !certificateEligible) {
    nextStep = { href: "/e-learning/certificate", label: "Exam passed — check certificate" };
  }

  return (
    <div className="shrink-0 rounded-2xl bg-[linear-gradient(165deg,#E6F9F5_0%,#fbfdfc_55%,#ffffff_100%)] p-3.5 ring-1 ring-[#d9ebe7]">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4d6570]">Progress</p>
        <p className="text-sm font-bold tabular-nums text-[#0B2C4A]">
          {shownDone}/{total}
          <span className="ml-1.5 text-xs font-semibold text-[#00A88F]">{Math.round(shownPercent)}%</span>
        </p>
      </div>
      <div
        className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-[#dcecea]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(shownPercent)}
        aria-label="Course completion"
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#00A88F,#00C4A7)] motion-safe:transition-[width] motion-safe:duration-500"
          style={{ width: `${shownPercent}%` }}
        />
      </div>
      {nextStep ? (
        <Link
          href={nextStep.href}
          onClick={onCloseMobile}
          className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-[#0B2C4A] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#123a5c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]"
        >
          <span className="min-w-0 truncate">{nextStep.label}</span>
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  );
}

function SidebarPartNav({
  modules,
  enrolled,
  pathname,
  onNavigate,
  accordion = true,
}: {
  modules: PortalModule[];
  enrolled: boolean;
  pathname: string;
  onNavigate: () => void;
  accordion?: boolean;
}) {
  const curriculumParts = useMemo(() => groupModulesByPart(modules), [modules]);
  const activeSlug = useMemo(() => {
    const match = pathname.match(/\/module\/([^/]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  const activePartKey = useMemo(() => {
    for (const { part, modules: partModules } of curriculumParts) {
      if (partModules.some((item) => item.slug === activeSlug)) {
        return String(part.number || part.title);
      }
    }
    return curriculumParts[0] ? String(curriculumParts[0].part.number || curriculumParts[0].part.title) : null;
  }, [curriculumParts, activeSlug]);

  const [openKey, setOpenKey] = useState<string | null>(activePartKey);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() =>
    activePartKey ? { [activePartKey]: true } : {},
  );

  useEffect(() => {
    if (!activePartKey) return;
    setOpenKey(activePartKey);
    setOpenMap((prev) => ({ ...prev, [activePartKey]: true }));
  }, [activePartKey]);

  function isOpen(key: string) {
    if (accordion) return openKey === key;
    return openMap[key] ?? false;
  }

  function toggle(key: string) {
    if (accordion) {
      setOpenKey((prev) => (prev === key ? null : key));
      return;
    }
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="mt-2 space-y-1.5">
      {curriculumParts.map(({ part, modules: partModules }) => {
        const key = String(part.number || part.title);
        const open = isOpen(key);
        const panelId = `sidebar-part-${key}`;
        const doneCount = partModules.filter((item) => toModuleStatus(item.status) === "completed").length;
        const containsActive = partModules.some((item) => item.slug === activeSlug);

        return (
          <div
            key={key}
            className={`overflow-hidden rounded-xl ring-1 motion-safe:transition-colors ${
              containsActive || open ? "bg-white ring-[#cfe8e2]" : "bg-[#fbfdfc] ring-[#eef4f3]"
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(key)}
              aria-expanded={open}
              aria-controls={panelId}
              className="flex w-full items-center gap-2 px-2.5 py-2.5 text-left hover:bg-[#f3f8f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00C4A7]"
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#E6F9F5] text-[10px] font-bold tabular-nums text-[#00A88F]">
                {part.number || "—"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold leading-snug text-[#0B2C4A]">{part.title}</span>
              </span>
              <span className="shrink-0 rounded-md bg-[#f3f8f7] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#4d6570]">
                {enrolled ? `${doneCount}/${partModules.length}` : partModules.length}
              </span>
              <svg
                viewBox="0 0 20 20"
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 fill-none stroke-current stroke-2 text-[#0B2C4A] motion-safe:transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              >
                <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div
              id={panelId}
              className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-200 ${
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden" inert={!open} aria-hidden={open ? undefined : true}>
                <ol className="space-y-0.5 border-t border-[#eef4f3] px-1.5 py-1.5">
                  {partModules.map((item) => {
                    const status = toModuleStatus(item.status);
                    const href = item.unlocked === false ? "/e-learning" : `/e-learning/module/${item.slug}`;
                    const active = pathname.includes(`/module/${item.slug}`);
                    const shown = displayModuleNumber(item.number);
                    return (
                      <li key={item.slug}>
                        <Link
                          href={href}
                          onClick={onNavigate}
                          title={`Module ${pad(shown)}: ${item.title}`}
                          className={`relative flex items-start gap-2 rounded-lg py-2 pl-2.5 pr-2 text-left motion-safe:transition-colors ${
                            active
                              ? "bg-[#E6F9F5] font-semibold text-[#0B2C4A] before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-[#00C4A7]"
                              : "text-[#36505c] hover:bg-[#f3f8f7]"
                          }`}
                        >
                          <span
                            className={`mt-0.5 inline-flex h-6 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tabular-nums ${
                              active ? "bg-white text-[#00A88F]" : "bg-[#f3f8f7] text-[#8aa0a8]"
                            }`}
                          >
                            {pad(shown)}
                          </span>
                          <span className="min-w-0 flex-1 text-[13px] leading-snug">{item.title}</span>
                          {enrolled ? (
                            <span className="mt-0.5 shrink-0">
                              <StatusIcon status={status} size={15} />
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NavIcon({ name }: { name: "dashboard" | "exam" | "certificate" | "menu" | "collapse" | "expand" }) {
  if (name === "dashboard") {
    return (
      <svg viewBox="0 0 20 20" className="h-5 w-5 fill-none stroke-current stroke-[1.6]" aria-hidden="true">
        <rect x="3" y="3" width="6" height="6" rx="1.5" />
        <rect x="11" y="3" width="6" height="6" rx="1.5" />
        <rect x="3" y="11" width="6" height="6" rx="1.5" />
        <rect x="11" y="11" width="6" height="6" rx="1.5" />
      </svg>
    );
  }
  if (name === "exam") {
    return (
      <svg viewBox="0 0 20 20" className="h-5 w-5 fill-none stroke-current stroke-[1.6]" aria-hidden="true">
        <path d="M6 3.5h8v13H6z" strokeLinejoin="round" />
        <path d="M8 7h4M8 10h4M8 13h2.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "certificate") {
    return (
      <svg viewBox="0 0 20 20" className="h-5 w-5 fill-none stroke-current stroke-[1.6]" aria-hidden="true">
        <circle cx="10" cy="8" r="4" />
        <path d="M7.5 11.5 6 17l4-2 4 2-1.5-5.5" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "menu") {
    return (
      <svg viewBox="0 0 20 20" className="h-5 w-5 fill-none stroke-current stroke-[1.8]" aria-hidden="true">
        <path d="M4 6h12M4 10h12M4 14h12" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "collapse") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-2" aria-hidden="true">
        <path d="M12.5 5 8 10l4.5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-2" aria-hidden="true">
      <path d="M7.5 5 12 10l-4.5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_PREF_KEY) === "collapsed");
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_PREF_KEY, next ? "collapsed" : "expanded");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { collapsed, toggle, ready };
}

function useMobileDrawer(open: boolean, onClose: () => void, panelRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const focusables = panel?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusables?.[0];
    first?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !focusables?.length) return;
      const list = Array.from(focusables);
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, panelRef]);
}

export function LearningPortal({ children, signedIn, enrolled, modules, progress, courseTitle }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerEntered, setDrawerEntered] = useState(false);
  const mobilePanelRef = useRef<HTMLElement | null>(null);
  const { collapsed, toggle: toggleCollapsed, ready: collapseReady } = useSidebarCollapsed();
  const collapseLabelId = useId();

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  useEffect(() => {
    if (mobileOpen) {
      setDrawerVisible(true);
      const id = window.requestAnimationFrame(() => setDrawerEntered(true));
      return () => window.cancelAnimationFrame(id);
    }
    setDrawerEntered(false);
    const timer = window.setTimeout(() => setDrawerVisible(false), 200);
    return () => window.clearTimeout(timer);
  }, [mobileOpen]);

  useMobileDrawer(mobileOpen, closeMobile, mobilePanelRef);

  if (pathname.startsWith("/e-learning/sign-in") || pathname.startsWith("/e-learning/sign-up")) {
    return children;
  }

  if (!signedIn) {
    return (
      <div className="flex-1 bg-[#f3f7f6] text-[#0B2C4A]">
        <main id="main-content" className="mx-auto w-full max-w-[90rem] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7 xl:px-10">
          {children}
        </main>
      </div>
    );
  }

  const done = progress?.completedModules ?? 0;
  const total = progress?.totalModules ?? modules.length;
  const percent = progress?.completionPercentage ?? 0;
  const dashboardActive = pathname === "/e-learning";
  const examActive = pathname.startsWith("/e-learning/final-exam");
  const certActive = pathname.startsWith("/e-learning/certificate");
  const examUnlocked = enrolled && done >= total && total > 0;
  const examStatus = progress?.examPassed ? "completed" : examUnlocked ? "available" : "locked";
  const railCollapsed = collapseReady && collapsed;

  const navLinkClass = (active: boolean, compact: boolean) =>
    compact
      ? `inline-flex h-10 w-10 items-center justify-center rounded-xl motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7] ${
          active ? "bg-[#E6F9F5] text-[#0B2C4A]" : "text-[#4d6570] hover:bg-[#f3f8f7]"
        }`
      : `flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-semibold leading-none motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00C4A7] ${
          active ? "bg-[#E6F9F5] text-[#0B2C4A]" : "text-[#36505c] hover:bg-[#f3f8f7]"
        }`;

  function renderSidebar(mode: "desktop" | "mobile") {
    const compact = mode === "desktop" && railCollapsed;
    const onNavigate = mode === "mobile" ? closeMobile : () => undefined;

    if (compact) {
      return (
        <div className="flex h-full min-h-0 flex-1 flex-col items-center py-3">
          <Link
            href="/e-learning"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]"
            title="Dashboard"
            aria-label="Consent Guru learning home"
          >
            <BrandLogo markOnly height={22} />
          </Link>

          <nav className="mt-4 flex flex-col items-center gap-1.5" aria-label="Primary">
            <Link href="/e-learning" className={navLinkClass(dashboardActive, true)} title="Dashboard" aria-current={dashboardActive ? "page" : undefined}>
              <NavIcon name="dashboard" />
              <span className="sr-only">Dashboard</span>
            </Link>
            {examUnlocked ? (
              <Link
                href="/e-learning/final-exam"
                className={navLinkClass(examActive, true)}
                title="Final exam"
                aria-current={examActive ? "page" : undefined}
              >
                <NavIcon name="exam" />
                <span className="sr-only">Final exam</span>
              </Link>
            ) : (
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#c5d6d2]" title="Final exam locked">
                <NavIcon name="exam" />
                <span className="sr-only">Final exam locked</span>
              </span>
            )}
            <Link
              href="/e-learning/certificate"
              className={navLinkClass(certActive, true)}
              title="Certificate"
              aria-current={certActive ? "page" : undefined}
            >
              <NavIcon name="certificate" />
              <span className="sr-only">Certificate</span>
            </Link>
          </nav>

          <div className="mt-4" title={`${done}/${total} modules · ${Math.round(enrolled ? percent : 0)}%`}>
            <CompactRing value={enrolled ? percent : 0} />
          </div>

          <div className="mt-auto flex flex-col items-center gap-2 pb-1">
            <button
              type="button"
              onClick={toggleCollapsed}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#d5e3e0] bg-white text-[#0B2C4A] hover:border-[#0B2C4A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]"
              aria-pressed={false}
              aria-labelledby={collapseLabelId}
              title="Expand sidebar"
            >
              <NavIcon name="expand" />
            </button>
            <span id={collapseLabelId} className="sr-only">
              Expand sidebar
            </span>
            <form action="/api/learning/sign-out" method="post">
              <button
                type="submit"
                title="Log out"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[11px] font-bold text-[#c62828] hover:bg-[#fdecea] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c62828]"
              >
                Out
              </button>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-[#e4eeec] px-3.5 py-3.5">
          <div className="flex items-center justify-between gap-2">
            <Link href="/e-learning" className="inline-flex min-w-0 items-center gap-2" onClick={onNavigate}>
              <BrandLogo height={26} />
            </Link>
            {mode === "desktop" ? (
              <button
                type="button"
                onClick={toggleCollapsed}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#d5e3e0] text-[#0B2C4A] hover:border-[#0B2C4A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]"
                aria-pressed={true}
                title="Collapse sidebar"
              >
                <NavIcon name="collapse" />
                <span className="sr-only">Collapse sidebar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={closeMobile}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#d5e3e0] text-[#0B2C4A] hover:border-[#0B2C4A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]"
                aria-label="Close menu"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-2" aria-hidden="true">
                  <path d="M5 5l10 10M15 5 5 15" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#4d6570]">Learning</p>
          <nav className="mt-2.5 space-y-1" aria-label="Primary">
            <Link href="/e-learning" onClick={onNavigate} className={navLinkClass(dashboardActive, false)} aria-current={dashboardActive ? "page" : undefined}>
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
                <NavIcon name="dashboard" />
              </span>
              <span className="min-w-0 flex-1 truncate text-left">Dashboard</span>
            </Link>
            {examUnlocked ? (
              <Link
                href="/e-learning/final-exam"
                onClick={onNavigate}
                className={navLinkClass(examActive, false)}
                aria-current={examActive ? "page" : undefined}
              >
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
                  <NavIcon name="exam" />
                </span>
                <span className="min-w-0 flex-1 truncate text-left">Final exam</span>
                {enrolled ? (
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
                    <StatusIcon status={examStatus} size={15} />
                  </span>
                ) : null}
              </Link>
            ) : (
              <div
                className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-semibold leading-none text-[#8aa0a8]"
                title="Complete all modules to unlock"
              >
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
                  <NavIcon name="exam" />
                </span>
                <span className="min-w-0 flex-1 truncate text-left">Final exam</span>
                {enrolled ? (
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
                    <StatusIcon status="locked" size={15} />
                  </span>
                ) : null}
              </div>
            )}
            <Link
              href="/e-learning/certificate"
              onClick={onNavigate}
              className={navLinkClass(certActive, false)}
              aria-current={certActive ? "page" : undefined}
            >
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
                <NavIcon name="certificate" />
              </span>
              <span className="min-w-0 flex-1 truncate text-left">Certificate</span>
              {progress?.certificateEligible ? (
                <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-[#00C4A7] px-1.5 text-[10px] font-bold leading-none text-[#0B2C4A]">
                  Ready
                </span>
              ) : (
                <span className="inline-flex h-5 w-5 shrink-0" aria-hidden="true" />
              )}
            </Link>
          </nav>
        </div>

        <div className="lesson-scroll mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-3 pb-3">
          <SidebarProgress
            enrolled={enrolled}
            done={done}
            total={total}
            percent={percent}
            examUnlocked={examUnlocked}
            examPassed={Boolean(progress?.examPassed)}
            certificateEligible={Boolean(progress?.certificateEligible)}
            onCloseMobile={onNavigate}
          />

          <div className="mt-4 flex flex-col">
            <p className="shrink-0 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#4d6570]">Curriculum</p>
            <SidebarPartNav modules={modules} enrolled={enrolled} pathname={pathname} onNavigate={onNavigate} />
          </div>
        </div>

        <div className="shrink-0 space-y-2 border-t border-[#e4eeec] px-3.5 py-3">
          <p className="truncate text-xs font-medium text-[#4d6570]" title={courseTitle}>
            {courseTitle}
          </p>
          <form action="/api/learning/sign-out" method="post" className="w-full">
            <button
              type="submit"
              onClick={onNavigate}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#fdecea] text-sm font-semibold leading-none text-[#c62828] transition-colors hover:bg-[#f8d7d4] hover:text-[#b71c1c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c62828]"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#f3f7f6] text-[#0B2C4A]">
      <div className="flex w-full">
        <aside
          className={`sticky top-[72px] hidden h-[calc(100dvh-72px)] shrink-0 overflow-hidden border-r border-[#e4eeec] bg-white motion-safe:transition-[width] motion-safe:duration-200 lg:flex lg:flex-col ${
            railCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH
          }`}
        >
          {renderSidebar("desktop")}
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-[72px] z-30 flex items-center justify-between gap-3 border-b border-[#e4eeec] bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d5e3e0] bg-white px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]"
              onClick={() => setMobileOpen(true)}
              aria-expanded={mobileOpen}
              aria-controls="learning-sidebar"
            >
              <NavIcon name="menu" />
              Menu
            </button>
            <Link href="/e-learning" className="font-semibold">
              DPDP training
            </Link>
            <div className="flex items-center gap-2">
              <CompactRing value={enrolled ? percent : 0} size={32} />
              <span className="text-sm font-semibold tabular-nums text-[#4d6570]">{enrolled ? `${done}/${total}` : "—"}</span>
            </div>
          </header>

          {drawerVisible ? (
            <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Learning menu">
              <button
                type="button"
                className={`absolute inset-0 bg-[#0B2C4A]/40 motion-safe:transition-opacity motion-safe:duration-200 ${
                  drawerEntered ? "opacity-100" : "opacity-0"
                }`}
                aria-label="Close menu"
                onClick={closeMobile}
              />
              <aside
                id="learning-sidebar"
                ref={mobilePanelRef}
                className={`absolute inset-y-0 left-0 flex h-full w-[19.5rem] max-w-[88vw] flex-col overflow-hidden bg-white shadow-2xl motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out ${
                  drawerEntered ? "translate-x-0" : "-translate-x-full"
                }`}
              >
                {renderSidebar("mobile")}
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
