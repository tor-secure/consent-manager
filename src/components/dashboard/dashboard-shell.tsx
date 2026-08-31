"use client";

import { useState, useEffect } from "react";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";

function IconSidebarOpen() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="9" y1="4" x2="9" y2="20" />
    </svg>
  );
}

function IconSidebarClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="15" y1="4" x2="15" y2="20" />
    </svg>
  );
}

export function SidebarToggleButton({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!collapsed}
      aria-controls="dashboard-sidebar"
      className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 soft-shadow hover:text-slate-900 hover:bg-slate-50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
    >
      {collapsed ? <IconSidebarOpen /> : <IconSidebarClose />}
    </button>
  );
}

export function DashboardShell({
  headerLeft,
  headerCenter,
  headerRight,
  children,
}: {
  headerLeft: React.ReactNode;
  headerCenter: React.ReactNode;
  headerRight: React.ReactNode;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("cmp:sidebar:collapsed");
      if (saved === "true") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "cmp:sidebar:collapsed",
        String(collapsed)
      );
    } catch {
    }
  }, [collapsed]);

  const onToggle = () => setCollapsed((v) => !v);
  const onMobileToggle = () => setMobileOpen((v) => !v);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside
          id="dashboard-sidebar"
          data-collapsed={collapsed}
          suppressHydrationWarning
          className={[
            "hidden lg:flex shrink-0 flex-col border-r border-slate-200 bg-white",
            collapsed ? "lg:w-24" : "lg:w-72 xl:w-[19rem]",
          ].join(" ")}
        >
          <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin">
            <SidebarNav collapsed={collapsed} onToggle={onToggle} />
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Sidebar navigation"
          >
            <div
              className="absolute inset-0 bg-slate-900/40 animate-fade-in"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-xl border-r border-slate-200 animate-slide-in">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100/60">
                  <div className="flex items-center gap-3 px-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-md shadow-indigo-500/25">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="white" />
                        <path d="M9 12l2 2 4-4" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold tracking-tight text-slate-900">Consent</p>
                      <p className="text-[13px] font-semibold text-slate-500 leading-none">Manager</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Close sidebar"
                    className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-500 soft-shadow hover:text-slate-900 hover:bg-slate-50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
                  <SidebarNav collapsed={false} onToggle={() => {}} />
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Main content area */}
        <div className="flex min-h-screen flex-1 flex-col min-w-0">
          {/* Top header */}
          <header className="sticky top-0 z-40 h-16 sm:h-[4.5rem] shrink-0 border-b border-slate-200 bg-white">
            <div className="flex h-full items-center justify-between px-3 sm:px-5 md:px-8 gap-2 sm:gap-4">
              <div className="flex items-center gap-2 min-w-0">
                {/* Mobile sidebar toggle */}
                <button
                  type="button"
                  onClick={onMobileToggle}
                  aria-label="Open sidebar"
                  aria-expanded={mobileOpen}
                  aria-controls="dashboard-sidebar"
                  className="lg:hidden relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 soft-shadow hover:text-slate-900 hover:bg-slate-50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
                {/* Desktop collapse toggle */}
                <div className="hidden lg:block">
                  <SidebarToggleButton collapsed={collapsed} onToggle={onToggle} />
                </div>
                <div className="flex items-center gap-3 min-w-0 ml-1">
                  {headerLeft}
                </div>
              </div>

              <div className="flex-1 flex justify-center">{headerCenter}</div>

              <div className="flex items-center">{headerRight}</div>
            </div>
          </header>

          {/* Page content — no wrapper padding; each page owns its own spacing */}
          <main className="flex-1 min-w-0 overflow-x-hidden animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
