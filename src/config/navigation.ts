export type DashboardNavigationItem = {
  title: string;
  href: string;
  description: string;
  ariaLabel?: string;
};

export type DashboardNavigationGroup = {
  title: string;
  items: DashboardNavigationItem[];
  /** When true, the group starts collapsed unless it contains the current route. */
  defaultCollapsed?: boolean;
  /** Skip the uppercase section label (used for the flat primary list). */
  hideHeading?: boolean;
};

export type DashboardSectionHub = {
  title: string;
  href: string;
  description: string;
  features: DashboardNavigationItem[];
};

export const consentManagementFeatures: DashboardNavigationItem[] = [
  { title: "Consent", href: "/dashboard/consent", description: "Visitor consent records" },
  { title: "Policies", href: "/dashboard/policies", description: "Consent policies" },
  { title: "Purposes", href: "/dashboard/purposes", description: "Processing purposes" },
  { title: "Vendors", href: "/dashboard/vendors", description: "Third-party vendors" },
  { title: "Transfers", href: "/dashboard/transfers", description: "Processing and cross-border transfers" },
  { title: "Trackers", href: "/dashboard/trackers", description: "Detected trackers" },
];

export const discoveryFeatures: DashboardNavigationItem[] = [
  { title: "Scanner", href: "/dashboard/scanner", description: "Scan websites" },
  { title: "Privacy drift", href: "/dashboard/monitoring", description: "Scan findings" },
  { title: "Privacy risk", href: "/dashboard/risk", description: "Risk overview" },
  { title: "Consent quality", href: "/dashboard/quality", description: "Operational quality score" },
  { title: "Analytics", href: "/dashboard/analytics", description: "Consent analytics" },
];

export const intelligenceFeatures: DashboardNavigationItem[] = [
  { title: "Consent firewall", href: "/dashboard/firewall", description: "Tracker blocking preview" },
  { title: "Impact simulator", href: "/dashboard/simulator", description: "Quality what-if scenarios" },
  { title: "Experiments", href: "/dashboard/experiments", description: "Banner A/B tests" },
  { title: "Dependency graph", href: "/dashboard/graph", description: "Purpose, vendor, and tracker links" },
  { title: "Recommendations", href: "/dashboard/recommendations", description: "Configuration gaps" },
  { title: "Data flow map", href: "/dashboard/data-flow", description: "Tracker-to-vendor flows" },
  { title: "Cross-domain consent", href: "/dashboard/cross-domain", description: "Portable consent exchange" },
  { title: "AI consent autopilot", href: "/dashboard/autopilot", description: "Assisted remediation plan" },
  { title: "Consent digital twin", href: "/dashboard/digital-twin", description: "Snapshot and impact comparison" },
  { title: "Consent ROI engine", href: "/dashboard/roi", description: "Business impact estimates" },
  { title: "Consent negotiation engine", href: "/dashboard/negotiation", description: "Target-based remediation and offers" },
  { title: "AI-agent permissioning", href: "/dashboard/agent-permissioning", description: "Purpose and vendor access checks" },
  { title: "Data redaction", href: "/dashboard/data-redaction", description: "Consent-filtered analytics" },
];

export const governanceFeatures: DashboardNavigationItem[] = [
  { title: "Audit logs", href: "/dashboard/audit-logs", description: "Activity history" },
  { title: "Notifications", href: "/dashboard/notifications", description: "Workspace alerts" },
  { title: "Privacy Rights", href: "/dashboard/rights-requests", description: "DSAR and rights-request workflow" },
];

export const developerFeatures: DashboardNavigationItem[] = [
  { title: "SDK & API keys", href: "/dashboard/developers", description: "Install snippets, site keys, and credentials" },
  { title: "Integrations", href: "/dashboard/integrations", description: "Connected tools" },
  { title: "Webhooks", href: "/dashboard/developers/webhooks", description: "Event delivery" },
];

export const administrationFeatures: DashboardNavigationItem[] = [
  { title: "Organization settings", href: "/dashboard/settings/organization", description: "Workspace and billing" },
  { title: "Data retention", href: "/dashboard/settings/retention", description: "Evidence and operational retention" },
  { title: "Team & roles", href: "/dashboard/settings/team", description: "Members and access" },
];

export const dashboardSectionHubs: DashboardSectionHub[] = [
  {
    title: "Consent Management",
    href: "/dashboard/consent-management",
    description: "Records, policies, purposes, vendors, transfers, and trackers.",
    features: consentManagementFeatures,
  },
  {
    title: "Discovery & Monitoring",
    href: "/dashboard/discovery",
    description: "Scan sites, review findings, and measure consent quality.",
    features: discoveryFeatures,
  },
  {
    title: "Intelligence",
    href: "/dashboard/intelligence",
    description: "Simulation, experiments, graphs, and assisted remediation tools.",
    features: intelligenceFeatures,
  },
  {
    title: "Security & Governance",
    href: "/dashboard/governance",
    description: "Audit history, alerts, and privacy-rights workflows.",
    features: governanceFeatures,
  },
  {
    title: "Developer",
    href: "/dashboard/developer",
    description: "Install the SDK, manage API keys, and connect integrations.",
    features: developerFeatures,
  },
  {
    title: "Administration",
    href: "/dashboard/administration",
    description: "Workspace settings, retention, and team access.",
    features: administrationFeatures,
  },
];

export const dashboardNavigationGroups: DashboardNavigationGroup[] = [
  {
    title: "Workspace",
    hideHeading: true,
    items: [
      { title: "Dashboard", href: "/dashboard", description: "Workspace overview and get-live path" },
      { title: "Websites", href: "/dashboard/websites", description: "Manage sites and installation" },
      ...dashboardSectionHubs.map((hub) => ({
        title: hub.title,
        href: hub.href,
        description: hub.description,
      })),
    ],
  },
];

export const dashboardNavigation = dashboardNavigationGroups.flatMap((group) => group.items);

export const dashboardFeaturePages: DashboardNavigationItem[] = dashboardSectionHubs.flatMap(
  (hub) => hub.features,
);

export const SETUP_NAV_HREFS = new Set([
  "/dashboard",
  "/dashboard/websites",
  "/dashboard/consent-management",
  "/dashboard/discovery",
  "/dashboard/developer",
]);

export function isPathActive(href: string, pathname: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;
  const hub = dashboardSectionHubs.find((item) => item.href === href);
  return Boolean(
    hub?.features.some((feature) => pathname === feature.href || pathname.startsWith(`${feature.href}/`)),
  );
}
