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
  { title: "Consent", href: "/dashboard/consent", description: "Review visitor consent records, proof, and withdrawal history for every site." },
  { title: "Policies", href: "/dashboard/policies", description: "Create, version, and publish consent banners and preference-center policies." },
  { title: "Purposes", href: "/dashboard/purposes", description: "Define processing purposes that map cookies, vendors, and legal bases." },
  { title: "Vendors", href: "/dashboard/vendors", description: "Catalog third-party vendors and the purposes they are allowed to serve." },
  { title: "Transfers", href: "/dashboard/transfers", description: "Track processing activities and cross-border data transfers." },
  { title: "Trackers", href: "/dashboard/trackers", description: "Classify detected cookies and trackers against your purposes and vendors." },
];

export const discoveryFeatures: DashboardNavigationItem[] = [
  { title: "Scanner", href: "/dashboard/scanner", description: "Scan websites to discover cookies, scripts, and third-party trackers." },
  { title: "Privacy drift", href: "/dashboard/monitoring", description: "Review scan findings when trackers or consent coverage change over time." },
  { title: "Privacy risk", href: "/dashboard/risk", description: "See a risk overview of unmapped trackers, gaps, and high-impact issues." },
  { title: "Consent quality", href: "/dashboard/quality", description: "Measure operational quality of banners, purposes, and vendor coverage." },
  { title: "Analytics", href: "/dashboard/analytics", description: "Track consent rates, preferences, and performance across your sites." },
];

export const intelligenceFeatures: DashboardNavigationItem[] = [
  { title: "Consent firewall", href: "/dashboard/firewall", description: "Preview which trackers would be blocked when consent is withheld." },
  { title: "Impact simulator", href: "/dashboard/simulator", description: "Run quality what-if scenarios before changing banners or purposes." },
  { title: "Experiments", href: "/dashboard/experiments", description: "A/B test banner copy, layout, and choices to improve consent rates." },
  { title: "Dependency graph", href: "/dashboard/graph", description: "Map links between purposes, vendors, and trackers in one graph." },
  { title: "Recommendations", href: "/dashboard/recommendations", description: "Close configuration gaps with prioritized, actionable suggestions." },
  { title: "Data flow map", href: "/dashboard/data-flow", description: "Follow tracker-to-vendor data flows across your properties." },
  { title: "Cross-domain consent", href: "/dashboard/cross-domain", description: "Exchange portable consent so preferences travel across domains." },
  { title: "AI consent autopilot", href: "/dashboard/autopilot", description: "Generate an assisted remediation plan for consent and tracker gaps." },
  { title: "Consent digital twin", href: "/dashboard/digital-twin", description: "Snapshot the current setup and compare the impact of proposed changes." },
  { title: "Consent ROI engine", href: "/dashboard/roi", description: "Estimate the business impact of consent coverage and quality changes." },
  { title: "Consent negotiation engine", href: "/dashboard/negotiation", description: "Set targets and offers that guide consent remediation work." },
  { title: "AI-agent permissioning", href: "/dashboard/agent-permissioning", description: "Check purpose and vendor access before an agent processes personal data." },
  { title: "Data redaction", href: "/dashboard/data-redaction", description: "Filter analytics so only consented categories remain visible." },
];

export const governanceFeatures: DashboardNavigationItem[] = [
  { title: "Audit logs", href: "/dashboard/audit-logs", description: "Inspect workspace activity history for configuration and access changes." },
  { title: "Notifications", href: "/dashboard/notifications", description: "Stay on top of scan findings, rights requests, and workspace alerts." },
  { title: "Privacy Rights", href: "/dashboard/rights-requests", description: "Run DSAR and rights-request workflows from intake through fulfillment." },
];

export const developerFeatures: DashboardNavigationItem[] = [
  { title: "SDK & API keys", href: "/dashboard/developers", description: "Install the SDK, copy snippets, and manage site keys and credentials." },
  { title: "Integrations", href: "/dashboard/integrations", description: "Connect analytics, tag managers, and other tools to consent signals." },
  { title: "Webhooks", href: "/dashboard/developers/webhooks", description: "Deliver consent and rights events to your own endpoints." },
];

export const administrationFeatures: DashboardNavigationItem[] = [
  { title: "Organization settings", href: "/dashboard/settings/organization", description: "Manage workspace details, branding, and billing for this organization." },
  { title: "Data retention", href: "/dashboard/settings/retention", description: "Set how long evidence, logs, and operational records are kept." },
  { title: "Team & roles", href: "/dashboard/settings/team", description: "Invite members and control who can view or change consent settings." },
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
