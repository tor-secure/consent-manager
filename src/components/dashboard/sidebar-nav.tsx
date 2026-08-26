"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ---------------------------------------------------------------------------
// Nav structure
// ---------------------------------------------------------------------------

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

type NavGroup = {
  heading: string;
  items: NavItem[];
};

// Inline SVG icons — no external icon library required.
// Each icon is 16×16, stroke-based, currentColor.

function IconOverview() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconWebsites() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1.75 8h12.5M8 1.75c-2 2-3 4-3 6.25s1 4.25 3 6.25M8 1.75c2 2 3 4 3 6.25S10 12.25 8 14.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconConsent() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 4h12M2 8h8M2 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconPolicies() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.75" y="1.75" width="10.5" height="12.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 5.5h6M5 8h6M5 10.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconPurposes() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconVendors() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 13V6l6-4 6 4v7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="5.75" y="8.75" width="4.5" height="4.25" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconScanner() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1.75 5V3a1.25 1.25 0 0 1 1.25-1.25H5M11 1.75h1.75A1.25 1.25 0 0 1 14 3v2M14 11v1.75A1.25 1.25 0 0 1 12.75 14H11M5 14.25H3.25A1.25 1.25 0 0 1 2 13v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M1.75 8h12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconAnalytics() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 12.5l3.5-4 3 2.5 3-5 2.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 14.25h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconAudit() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.75V8l2.25 2.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconIntegrations() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="3.5" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12.5" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12.5" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 8h2.5m0 0 2-4m-2 4 2 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconDeveloper() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5.5 5.5 3 8l2.5 2.5M10.5 5.5 13 8l-2.5 2.5M7.5 11l1-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 1.75V3M8 13v1.25M1.75 8H3M13 8h1.25M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M12.6 3.4l-1.06 1.06M4.46 11.54l-1.06 1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconBilling() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.75" y="3.75" width="12.5" height="8.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1.75 6.75h12.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconNotifications() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.75A4.25 4.25 0 0 0 3.75 6v3.5L2.5 11h11l-1.25-1.5V6A4.25 4.25 0 0 0 8 1.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6.5 11v.5a1.5 1.5 0 0 0 3 0V11" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconWebhooks() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 3a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5v2.5L5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 12a2 2 0 1 0 0 2 2 2 0 0 0 0-2Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7.5h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11.5 7.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Nav groups definition
// ---------------------------------------------------------------------------

const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Overview",
    items: [
      {
        label: "Overview",
        href: "/dashboard",
        icon: <IconOverview />,
      },
    ],
  },
  {
    heading: "Websites",
    items: [
      {
        label: "Websites",
        href: "/dashboard/websites",
        icon: <IconWebsites />,
      },
    ],
  },
  {
    heading: "Consent",
    items: [
      {
        label: "Policies",
        href: "/dashboard/policies",
        icon: <IconPolicies />,
      },
      {
        label: "Purposes",
        href: "/dashboard/purposes",
        icon: <IconPurposes />,
      },
      {
        label: "Vendors",
        href: "/dashboard/vendors",
        icon: <IconVendors />,
      },
      {
        label: "Consent Records",
        href: "/dashboard/consent",
        icon: <IconConsent />,
      },
    ],
  },
  {
    heading: "Scanner",
    items: [
      {
        label: "Scanner",
        href: "/dashboard/scanner",
        icon: <IconScanner />,
      },
    ],
  },
  {
    heading: "Analytics",
    items: [
      {
        label: "Analytics",
        href: "/dashboard/analytics",
        icon: <IconAnalytics />,
      },
      {
        label: "Audit Logs",
        href: "/dashboard/audit-logs",
        icon: <IconAudit />,
      },
    ],
  },
  {
    heading: "Developer",
    items: [
      {
        label: "Integrations",
        href: "/dashboard/integrations",
        icon: <IconIntegrations />,
      },
      {
        label: "API Keys",
        href: "/dashboard/developers",
        icon: <IconDeveloper />,
      },
      {
        label: "Webhooks",
        href: "/dashboard/developers/webhooks",
        icon: <IconWebhooks />,
      },
      {
        label: "Notifications",
        href: "/dashboard/notifications",
        icon: <IconNotifications />,
      },
    ],
  },
  {
    heading: "Account",
    items: [
      {
        label: "Settings",
        href: "/dashboard/settings",
        icon: <IconSettings />,
      },
      {
        label: "Billing",
        href: "/dashboard/billing",
        icon: <IconBilling />,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// NavItem component
// ---------------------------------------------------------------------------

function SidebarItem({ item }: { item: NavItem }) {
  const pathname = usePathname();

  // Exact match for /dashboard; prefix match for all sub-routes.
  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      className={[
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-neutral-100 font-medium text-neutral-900"
          : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900",
      ].join(" ")}
      aria-current={isActive ? "page" : undefined}
    >
      <span className={isActive ? "text-neutral-900" : "text-neutral-400"}>
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Sidebar component — exported, used by DashboardLayout
// ---------------------------------------------------------------------------

export function SidebarNav() {
  return (
    <nav aria-label="Dashboard navigation" className="flex flex-col gap-5 px-3 py-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.heading}>
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            {group.heading}
          </p>

          <ul role="list" className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <SidebarItem item={item} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
