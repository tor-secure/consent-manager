"use client";

import { useState, useSyncExternalStore } from "react";
import { WorkspaceSectionNav } from "./workspace-section-nav";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { SkipLink } from "@/components/ui/skip-link";
import { DetailDrawer } from "@/components/ui/detail-drawer";

const SIDEBAR_STORAGE_KEY = "cmp:sidebar:collapsed";
const SIDEBAR_EVENT = "cmp-sidebar-change";

function readCollapsed() {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function subscribeToCollapsed(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SIDEBAR_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SIDEBAR_EVENT, onStoreChange);
  };
}

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
      className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] shadow-[var(--shadow-sm)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-[background-color,color,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
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
  setupMode = false,
}: {
  headerLeft: React.ReactNode;
  headerCenter: React.ReactNode;
  headerRight: React.ReactNode;
  children: React.ReactNode;
  setupMode?: boolean;
}) {
  const collapsed = useSyncExternalStore(
    subscribeToCollapsed,
    readCollapsed,
    () => false,
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const onToggle = () => {
    const next = !collapsed;
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
    } catch {
      return;
    }
    window.dispatchEvent(new Event(SIDEBAR_EVENT));
  };
  const onMobileToggle = () => setMobileOpen((v) => !v);

  return (
    <div className="dashboard-workspace min-h-screen bg-[var(--background)]">
      <SkipLink />
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside
          id="dashboard-sidebar"
          data-collapsed={collapsed}
          suppressHydrationWarning
          className={[
            "workspace-sidebar hidden lg:flex shrink-0 flex-col transition-[width] duration-200 ease-out",
            collapsed ? "lg:w-[4.75rem]" : "lg:w-[15.5rem]",
          ].join(" ")}
        >
          <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin">
            <SidebarNav collapsed={collapsed} onToggle={onToggle} setupMode={setupMode} />
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        <DetailDrawer title="Workspace navigation" open={mobileOpen} onClose={() => setMobileOpen(false)}>
          <div id="dashboard-mobile-sidebar" onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setMobileOpen(false); }}><SidebarNav collapsed={false} onToggle={() => {}} setupMode={setupMode} /></div>
        </DetailDrawer>

        {/* Main content area */}
        <div className="flex min-h-screen flex-1 flex-col min-w-0">
          {/* Top header */}
          <header className="workspace-header sticky top-0 z-40 shrink-0 border-b border-[var(--border)]">
            <div className="flex h-16 min-w-0 items-center gap-1.5 overflow-x-auto overscroll-x-contain px-3 sm:gap-2 sm:overflow-visible sm:px-4 md:gap-3 md:px-6">
              <div className="flex min-w-0 shrink items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={onMobileToggle}
                  aria-label="Open sidebar"
                  aria-expanded={mobileOpen}
                  aria-controls="dashboard-mobile-sidebar"
                  className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
                <div className="hidden shrink-0 lg:block">
                  <SidebarToggleButton collapsed={collapsed} onToggle={onToggle} />
                </div>
                <div className="min-w-0">
                  {headerLeft}
                </div>
              </div>

              <div className="flex min-w-0 flex-1 items-center">
                {headerCenter}
              </div>

              <div className="flex shrink-0 items-center">
                {headerRight}
              </div>
            </div>
          </header>
          <WorkspaceSectionNav />

          {/* Page content — no wrapper padding; each page owns its own spacing */}
          <main id="main-content" className="min-w-0 flex-1 overflow-x-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
