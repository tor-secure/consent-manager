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
};

export const dashboardNavigationGroups: DashboardNavigationGroup[] = [
  { title: "Overview", items: [{ title: "Dashboard", href: "/dashboard", description: "Workspace overview and get-live path" }] },
  { title: "Websites", items: [{ title: "Websites", href: "/dashboard/websites", description: "Manage sites and installation" }] },
  { title: "Consent Management", items: [
    { title: "Consent", href: "/dashboard/consent", description: "Visitor consent records" },
    { title: "Policies", href: "/dashboard/policies", description: "Consent policies" },
    { title: "Purposes", href: "/dashboard/purposes", description: "Processing purposes" },
    { title: "Vendors", href: "/dashboard/vendors", description: "Third-party vendors" },
    { title: "Transfers", href: "/dashboard/transfers", description: "Processing and cross-border transfers" },
    { title: "Trackers", href: "/dashboard/trackers", description: "Detected trackers" },
  ] },
  { title: "Discovery & Monitoring", defaultCollapsed: true, items: [
    { title: "Scanner", href: "/dashboard/scanner", description: "Scan websites" },
    { title: "Privacy drift", href: "/dashboard/monitoring", description: "Scan findings" },
    { title: "Privacy risk", href: "/dashboard/risk", description: "Risk overview" },
    { title: "Consent quality", href: "/dashboard/quality", description: "Operational quality score" },
    { title: "Analytics", href: "/dashboard/analytics", description: "Consent analytics" },
  ] },
  { title: "Intelligence", defaultCollapsed: true, items: [
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
  ] },
  { title: "Security & Governance", items: [
    { title: "Audit logs", href: "/dashboard/audit-logs", description: "Activity history" },
    { title: "Notifications", href: "/dashboard/notifications", description: "Workspace alerts" },
    { title: "Privacy Rights", href: "/dashboard/rights-requests", description: "DSAR and rights-request workflow" },
  ] },
  { title: "Developer", items: [
    { title: "SDK & API keys", href: "/dashboard/developers", description: "Install snippets, site keys, and credentials" },
    { title: "Integrations", href: "/dashboard/integrations", description: "Connected tools" },
    { title: "Webhooks", href: "/dashboard/developers/webhooks", description: "Event delivery" },
  ] },
  { title: "Administration", items: [
    { title: "Organization settings", href: "/dashboard/settings/organization", description: "Workspace and billing" },
    { title: "Data retention", href: "/dashboard/settings/retention", description: "Evidence and operational retention" },
    { title: "Team & roles", href: "/dashboard/settings/team", description: "Members and access" },
  ] },
];

export const dashboardNavigation = dashboardNavigationGroups.flatMap((group) => group.items);

export const SETUP_NAV_HREFS = new Set([
  "/dashboard",
  "/dashboard/websites",
  "/dashboard/policies",
  "/dashboard/purposes",
  "/dashboard/developers",
  "/dashboard/analytics",
]);