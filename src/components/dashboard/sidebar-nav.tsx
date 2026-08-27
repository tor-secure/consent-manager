"use client";

import Link from "next/link";
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
      { label: "Analytics", href: "/dashboard/analytics", icon: <IconAnalytics />, ariaLabel: "View consent analytics" },
    ],
  },
  {
    label: "Security & Governance",
    items: [
      { label: "Audit Logs", href: "/dashboard/audit-logs", icon: <IconAuditLogs />, ariaLabel: "Review audit logs" },
      { label: "Notifications", href: "/dashboard/notifications", icon: <IconNotifications />, ariaLabel: "View notifications" },
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
      { label: "Team / Roles", href: "/dashboard/settings/organization", icon: <IconTeam />, ariaLabel: "Manage team members and roles" },
      { label: "Billing", href: "/dashboard/settings/organization", icon: <IconBilling />, ariaLabel: "Billing and subscription" },
    ],
  },
];

function SidebarItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();

  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      aria-label={item.ariaLabel}
      title={collapsed ? item.label : undefined}
      className={[
        "group relative flex items-center gap-3.5 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200",
        collapsed ? "justify-center px-2" : "",
        isActive
          ? "sidebar-item-active"
          : "text-slate-600 hover:bg-slate-100/60 hover:text-slate-900",
      ].join(" ")}
      aria-current={isActive ? "page" : undefined}
    >
      <span
        className={[
          "flex shrink-0 items-center justify-center transition-colors duration-200",
          isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600",
        ].join(" ")}
      >
        {item.icon}
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-xl bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg shadow-slate-900/20 transition-opacity duration-150 group-hover:opacity-100">
          {item.label}
        </span>
      )}
    </Link>
  );
}

function SidebarGroupLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return null;
  return (
    <div className="mt-6 first:mt-0 mb-2.5 px-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </p>
    </div>
  );
}

function BrandLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      suppressHydrationWarning
      className={`flex items-center gap-3 px-1 py-2 ${collapsed ? "justify-center px-0" : ""}`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl gradient-primary shadow-lg shadow-indigo-500/25">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="white" />
          <path d="M9 12l2 2 4-4" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="text-[17px] font-bold tracking-tight text-slate-900">Consent</p>
          <p className="text-[15px] font-semibold text-slate-500 leading-none">Manager</p>
        </div>
      )}
    </div>
  );
}

function CompliancePromo({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl gradient-primary shadow-lg shadow-indigo-500/25">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 11l3 3L22 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  return (
    <div className="rounded-3xl bg-gradient-to-br from-slate-50 to-indigo-50/50 p-5 card-shadow">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-lg shadow-indigo-500/25">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 11l3 3L22 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h4 className="text-center text-sm font-semibold text-slate-900">
        Stay compliant
      </h4>
      <p className="mt-1.5 text-center text-xs leading-relaxed text-slate-500">
        Manage consents and build trust transparently.
      </p>
    </div>
  );
}

export function SidebarNav({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <div
      suppressHydrationWarning
      className={`flex h-full flex-col ${collapsed ? "px-3 py-5" : "px-4 py-6"} transition-[padding] duration-200`}
    >
      <div className="mb-6 shrink-0">
        <BrandLogo collapsed={collapsed} />
      </div>

      <nav
        aria-label="Dashboard navigation"
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin pr-1"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label} role="group" aria-label={group.label}>
            <SidebarGroupLabel label={group.label} collapsed={collapsed} />
            <ul role="list" className="space-y-1">
              {group.items.map((item) => (
                <li key={`${group.label}:${item.label}`}>
                  <SidebarItem item={item} collapsed={collapsed} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={`shrink-0 ${collapsed ? "mt-6" : "mt-6"}`}>
        <CompliancePromo collapsed={collapsed} />
      </div>
    </div>
  );
}
