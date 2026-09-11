"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { dashboardNavigationGroups, isPathActive, SETUP_NAV_HREFS } from "@/config/navigation";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  ariaLabel?: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
  defaultCollapsed?: boolean;
  hideHeading?: boolean;
};

function IconOverview() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function IconWebsites() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="4" x2="9" y2="20" />
    </svg>
  );
}

function IconConsent() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

function IconAnalytics() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconApiKeys() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function IconOrganization() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-4" />
    </svg>
  );
}

function IconIntelligence() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 016 6c0 2.2-1.2 4.1-3 5.2V17a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2.8C7.2 13.1 6 11.2 6 9a6 6 0 016-6z" />
      <path d="M9 21h6" />
    </svg>
  );
}

function IconDiscovery() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function IconGovernance() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function iconForHref(href: string) {
  if (href === "/dashboard") return <IconOverview />;
  if (href === "/dashboard/websites") return <IconWebsites />;
  if (href === "/dashboard/consent-management") return <IconConsent />;
  if (href === "/dashboard/discovery") return <IconDiscovery />;
  if (href === "/dashboard/intelligence") return <IconIntelligence />;
  if (href === "/dashboard/governance") return <IconGovernance />;
  if (href === "/dashboard/developer") return <IconApiKeys />;
  if (href === "/dashboard/administration") return <IconOrganization />;
  return <IconAnalytics />;
}

const ALL_NAV_GROUPS: NavGroup[] = dashboardNavigationGroups.map((group) => ({
  label: group.title,
  defaultCollapsed: group.defaultCollapsed,
  hideHeading: group.hideHeading,
  items: group.items.map((item) => ({
    label: item.title,
    href: item.href,
    icon: iconForHref(item.href),
    ariaLabel: item.ariaLabel ?? item.description,
  })),
}));

function groupsForMode(setupMode: boolean): NavGroup[] {
  if (!setupMode) return ALL_NAV_GROUPS;
  const primary: NavGroup[] = [];
  const moreItems: NavItem[] = [];
  for (const group of ALL_NAV_GROUPS) {
    const kept = group.items.filter((item) => SETUP_NAV_HREFS.has(item.href));
    const rest = group.items.filter((item) => !SETUP_NAV_HREFS.has(item.href));
    moreItems.push(...rest);
    if (kept.length > 0) {
      primary.push({ ...group, items: kept, defaultCollapsed: false });
    }
  }
  if (moreItems.length > 0) {
    primary.push({ label: "More tools", items: moreItems, defaultCollapsed: true });
  }
  return primary;
}

function SidebarItem({
  item,
  collapsed,
  pendingHref,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  pendingHref: string | null;
  onNavigate: (href: string) => void;
}) {
  const pathname = usePathname();

  const isActive = isPathActive(item.href, pathname);
  const isPending = pendingHref === item.href && !isActive;
  const showActive = isActive || isPending;

  return (
    <Link
      href={item.href}
      aria-label={item.ariaLabel}
      title={collapsed ? item.label : undefined}
      aria-busy={isPending || undefined}
      onClick={() => {
        if (!isActive) onNavigate(item.href);
      }}
      className={[
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
        "transition-[background-color,color,box-shadow] duration-200 ease-out min-h-11",
        collapsed ? "justify-center px-2" : "",
        showActive
          ? "sidebar-item-active"
          : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
      ].join(" ")}
      aria-current={isActive ? "page" : undefined}
    >
      <span
        className={[
          "flex shrink-0 items-center justify-center transition-colors duration-200",
          showActive ? "text-[var(--primary)]" : "text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]",
        ].join(" ")}
      >
        {item.icon}
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-xl bg-[var(--popover)] px-2.5 py-1.5 text-xs font-medium text-[var(--popover-foreground)] opacity-0 shadow-[var(--shadow-md)] border border-[var(--border)] transition-opacity duration-150 group-hover:opacity-100">
          {item.label}
        </span>
      )}
    </Link>
  );
}

const SIDEBAR_GROUPS_KEY = "cmp.sidebar.open-groups";

function groupContainsPath(group: NavGroup, pathname: string) {
  return group.items.some((item) => isPathActive(item.href, pathname));
}

function defaultGroupOpen(group: NavGroup, pathname: string) {
  return groupContainsPath(group, pathname) || !group.defaultCollapsed;
}

function readOpenGroups(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(SIDEBAR_GROUPS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeOpenGroups(next: Record<string, boolean>) {
  try {
    window.localStorage.setItem(SIDEBAR_GROUPS_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 text-[var(--muted-foreground)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function SidebarGroup({
  group,
  collapsed,
  pendingHref,
  onNavigate,
  open,
  onToggle,
}: {
  group: NavGroup;
  collapsed: boolean;
  pendingHref: string | null;
  onNavigate: (href: string) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const collapsible = !group.hideHeading && group.items.length > 1;
  const panelId = `sidebar-group-${group.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  const showItems = collapsed || !collapsible || open;

  return (
    <div className="mt-2 first:mt-0" role="group" aria-label={group.label}>
      {collapsed || group.hideHeading ? null : collapsible ? (
        <button
          type="button"
          className="mb-1 flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-2 py-2 text-left transition-colors duration-200 hover:bg-[var(--muted)]"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
            {group.label}
          </span>
          <IconChevron open={open} />
        </button>
      ) : (
        <div className="mb-1 px-2 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
            {group.label}
          </p>
        </div>
      )}
      <ul
        id={collapsible && !collapsed ? panelId : undefined}
        role="list"
        hidden={!showItems}
        className={showItems ? "space-y-1" : "hidden"}
      >
        {group.items.map((item) => (
          <li key={`${group.label}:${item.label}`}>
            <SidebarItem
              item={item}
              collapsed={collapsed}
              pendingHref={pendingHref}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function BrandLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      suppressHydrationWarning
      className={`icon-text-row px-1 py-2 ${collapsed ? "justify-center px-0" : ""}`}
    >
      <div data-icon-tile className="mt-0 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary)]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="white" />
          <path d="M9 12l2 2 4-4" stroke="currentColor" className="text-[var(--primary)]" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {!collapsed && (
        <div className="icon-text-body self-center">
          <p className="text-[17px] font-bold leading-snug tracking-tight text-[var(--foreground)]">ConsentFlow</p>
          <p className="text-[12px] font-medium leading-snug text-[var(--muted-foreground)]">Consent Manager</p>
        </div>
      )}
    </div>
  );
}

function CompliancePromo({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl gradient-primary">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 11l3 3L22 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary)]">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 11l3 3L22 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h4 className="text-center text-sm font-semibold text-[var(--foreground)]">
        Stay compliant
      </h4>
      <p className="mt-1.5 text-center text-xs leading-relaxed text-[var(--muted-foreground)]">
        Manage consents and build trust transparently.
      </p>
    </div>
  );
}

export function SidebarNav({
  collapsed,
  setupMode = false,
}: {
  collapsed: boolean;
  onToggle: () => void;
  setupMode?: boolean;
}) {
  const pathname = usePathname();
  const navGroups = groupsForMode(setupMode);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of navGroups) {
      initial[group.label] = defaultGroupOpen(group, pathname);
    }
    return initial;
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    const stored = readOpenGroups();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenGroups((current) => {
      const next = { ...current };
      for (const group of groupsForMode(setupMode)) {
        if (groupContainsPath(group, pathname)) {
          next[group.label] = true;
        } else if (typeof stored[group.label] === "boolean") {
          next[group.label] = stored[group.label];
        } else {
          next[group.label] = defaultGroupOpen(group, pathname);
        }
      }
      writeOpenGroups(next);
      return next;
    });
  }, [pathname, setupMode]);

  function toggleGroup(label: string) {
    setOpenGroups((current) => {
      const next = { ...current, [label]: !current[label] };
      writeOpenGroups(next);
      return next;
    });
  }

  return (
    <div
      suppressHydrationWarning
      className={`flex h-full flex-col ${collapsed ? "px-3 py-5" : "px-3 py-5 sm:px-4 sm:py-6"}`}
    >
      <div className="mb-6 shrink-0">
        <BrandLogo collapsed={collapsed} />
      </div>

      <nav
        aria-label="Dashboard navigation"
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin pr-1"
      >
        {navGroups.map((group) => (
          <SidebarGroup
            key={group.label}
            group={group}
            collapsed={collapsed}
            pendingHref={pendingHref}
            onNavigate={setPendingHref}
            open={Boolean(openGroups[group.label])}
            onToggle={() => toggleGroup(group.label)}
          />
        ))}
      </nav>

      <div className={`shrink-0 ${collapsed ? "mt-6" : "mt-6"}`}>
        <CompliancePromo collapsed={collapsed} />
      </div>
    </div>
  );
}
