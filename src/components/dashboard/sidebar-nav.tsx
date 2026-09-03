"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  ariaLabel?: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
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

function IconPolicies() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function IconPurposes() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function IconVendors() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconTrackers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

function IconScanner() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 012-2h2" />
      <path d="M17 3h2a2 2 0 012 2v2" />
      <path d="M21 17v2a2 2 0 01-2 2h-2" />
      <path d="M7 21H5a2 2 0 01-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
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

function IconRightsRequests() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

function IconAuditLogs() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconNotifications() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
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

function IconIntegrations() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function IconWebhooks() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
    </svg>
  );
}

function IconSDK() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
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

function IconTeam() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function IconBilling() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <IconOverview />, ariaLabel: "Go to Dashboard overview" },
    ],
  },
  {
    label: "Websites",
    items: [
      { label: "Websites", href: "/dashboard/websites", icon: <IconWebsites />, ariaLabel: "Manage your websites" },
    ],
  },
  {
    label: "Consent Management",
    items: [
      { label: "Consent", href: "/dashboard/consent", icon: <IconConsent />, ariaLabel: "View consent records" },
      { label: "Policies", href: "/dashboard/policies", icon: <IconPolicies />, ariaLabel: "Manage consent policies" },
      { label: "Purposes", href: "/dashboard/purposes", icon: <IconPurposes />, ariaLabel: "Manage consent purposes" },
      { label: "Vendors", href: "/dashboard/vendors", icon: <IconVendors />, ariaLabel: "Manage third-party vendors" },
      { label: "Trackers", href: "/dashboard/trackers", icon: <IconTrackers />, ariaLabel: "Manage detected trackers" },
    ],
  },
  {
    label: "Discovery & Monitoring",
    items: [
      { label: "Scanner", href: "/dashboard/scanner", icon: <IconScanner />, ariaLabel: "Run website scans" },
      { label: "Privacy drift", href: "/dashboard/monitoring", icon: <IconAnalytics />, ariaLabel: "Review privacy drift findings" },
      { label: "Privacy risk", href: "/dashboard/risk", icon: <IconAnalytics />, ariaLabel: "Review privacy risk" },
      { label: "Consent quality", href: "/dashboard/quality", icon: <IconAnalytics />, ariaLabel: "View consent quality scores" },
      { label: "Analytics", href: "/dashboard/analytics", icon: <IconAnalytics />, ariaLabel: "View consent analytics" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Consent firewall", href: "/dashboard/firewall", icon: <IconAnalytics />, ariaLabel: "Preview tracker blocking" },
      { label: "Impact simulator", href: "/dashboard/simulator", icon: <IconAnalytics />, ariaLabel: "Simulate privacy impact" },
      { label: "Experiments", href: "/dashboard/experiments", icon: <IconAnalytics />, ariaLabel: "Banner A/B tests" },
      { label: "Dependency graph", href: "/dashboard/graph", icon: <IconAnalytics />, ariaLabel: "Consent dependency graph" },
      { label: "Recommendations", href: "/dashboard/recommendations", icon: <IconAnalytics />, ariaLabel: "Consent recommendations" },
      { label: "Data flow map", href: "/dashboard/data-flow", icon: <IconAnalytics />, ariaLabel: "Data flow consent map" },
      { label: "Cross-domain consent", href: "/dashboard/cross-domain", icon: <IconAnalytics />, ariaLabel: "Cross-domain & cross-device consent exchange" },
      { label: "AI consent autopilot", href: "/dashboard/autopilot", icon: <IconAnalytics />, ariaLabel: "AI consent autopilot" },
      { label: "Consent digital twin", href: "/dashboard/digital-twin", icon: <IconAnalytics />, ariaLabel: "Consent digital twin" },
      { label: "Consent ROI engine", href: "/dashboard/roi", icon: <IconAnalytics />, ariaLabel: "Consent ROI engine" },
      { label: "Consent negotiation engine", href: "/dashboard/negotiation", icon: <IconAnalytics />, ariaLabel: "Consent negotiation engine" },
      { label: "AI-agent permissioning", href: "/dashboard/agent-permissioning", icon: <IconAnalytics />, ariaLabel: "AI-agent permissioning" },
      { label: "Data redaction", href: "/dashboard/data-redaction", icon: <IconAnalytics />, ariaLabel: "Real-time consent-based data redaction" },
    ],
  },
  {
    label: "Security & Governance",
    items: [
      { label: "Audit Logs",       href: "/dashboard/audit-logs",       icon: <IconAuditLogs />,       ariaLabel: "Review audit logs" },
      { label: "Notifications",    href: "/dashboard/notifications",    icon: <IconNotifications />,   ariaLabel: "View notifications" },
      { label: "Rights Requests",  href: "/dashboard/rights-requests",  icon: <IconRightsRequests />,  ariaLabel: "Manage DPDP rights requests" },
    ],
  },
  {
    label: "Developer",
    items: [
      { label: "API Keys", href: "/dashboard/developers", icon: <IconApiKeys />, ariaLabel: "Manage API keys" },
      { label: "Integrations", href: "/dashboard/integrations", icon: <IconIntegrations />, ariaLabel: "Manage integrations" },
      { label: "Webhooks", href: "/dashboard/developers/webhooks", icon: <IconWebhooks />, ariaLabel: "Configure webhooks" },
      { label: "SDK / Installation", href: "/dashboard/developers", icon: <IconSDK />, ariaLabel: "SDK installation guide" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Organization Settings", href: "/dashboard/settings/organization", icon: <IconOrganization />, ariaLabel: "Organization settings" },
      { label: "Team / Roles", href: "/dashboard/settings/team", icon: <IconTeam />, ariaLabel: "Manage team members and roles" },
      { label: "Billing", href: "/dashboard/settings/organization", icon: <IconBilling />, ariaLabel: "Billing and subscription" },
    ],
  },
];

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

  const isActive = isItemActive(item.href, pathname);
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

function isItemActive(href: string, pathname: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupContainsPath(group: NavGroup, pathname: string) {
  return group.items.some((item) => isItemActive(item.href, pathname));
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
  const collapsible = group.items.length > 1;
  const panelId = `sidebar-group-${group.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  const showItems = collapsed || !collapsible || open;

  return (
    <div className="mt-2 first:mt-0" role="group" aria-label={group.label}>
      {collapsed ? null : collapsible ? (
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

export function SidebarNav({ collapsed }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of NAV_GROUPS) {
      initial[group.label] = groupContainsPath(group, pathname);
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
      for (const group of NAV_GROUPS) {
        if (groupContainsPath(group, pathname)) {
          next[group.label] = true;
        } else if (typeof stored[group.label] === "boolean") {
          next[group.label] = stored[group.label];
        }
      }
      writeOpenGroups(next);
      return next;
    });
  }, [pathname]);

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
        {NAV_GROUPS.map((group) => (
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
