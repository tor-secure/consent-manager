export type DashboardSearchHit = {
  id: string;
  type: "page" | "website" | "policy" | "purpose" | "vendor";
  title: string;
  subtitle: string;
  href: string;
};

export const DASHBOARD_PAGES: DashboardSearchHit[] = [
  { id: "page:dashboard", type: "page", title: "Dashboard", subtitle: "Overview", href: "/dashboard" },
  { id: "page:websites", type: "page", title: "Websites", subtitle: "Manage sites", href: "/dashboard/websites" },
  { id: "page:websites-new", type: "page", title: "Add website", subtitle: "Register a site", href: "/dashboard/websites/new" },
  { id: "page:regulations", type: "page", title: "Consent regulations", subtitle: "Jurisdiction and signals", href: "/dashboard/websites" },
  { id: "page:consent", type: "page", title: "Consent records", subtitle: "Visitor consent", href: "/dashboard/consent" },
  { id: "page:policies", type: "page", title: "Policies", subtitle: "Consent policies", href: "/dashboard/policies" },
  { id: "page:policies-new", type: "page", title: "Create policy", subtitle: "New consent policy", href: "/dashboard/policies/new" },
  { id: "page:purposes", type: "page", title: "Purposes", subtitle: "Processing purposes", href: "/dashboard/purposes" },
  { id: "page:vendors", type: "page", title: "Vendors", subtitle: "Third-party vendors", href: "/dashboard/vendors" },
  { id: "page:trackers", type: "page", title: "Trackers", subtitle: "Detected trackers", href: "/dashboard/trackers" },
  { id: "page:scanner", type: "page", title: "Scanner", subtitle: "Scan websites", href: "/dashboard/scanner" },
  { id: "page:monitoring", type: "page", title: "Privacy drift", subtitle: "Scan findings", href: "/dashboard/monitoring" },
  { id: "page:risk", type: "page", title: "Privacy risk", subtitle: "Risk overview", href: "/dashboard/risk" },
  { id: "page:quality", type: "page", title: "Consent quality", subtitle: "Operational score", href: "/dashboard/quality" },
  { id: "page:analytics", type: "page", title: "Analytics", subtitle: "Consent analytics", href: "/dashboard/analytics" },
  { id: "page:firewall", type: "page", title: "Consent firewall", subtitle: "Block vs allow preview", href: "/dashboard/firewall" },
  { id: "page:simulator", type: "page", title: "Privacy impact simulator", subtitle: "Quality what-if", href: "/dashboard/simulator" },
  { id: "page:experiments", type: "page", title: "Consent experiments", subtitle: "Banner A/B tests", href: "/dashboard/experiments" },
  { id: "page:graph", type: "page", title: "Consent dependency graph", subtitle: "Purposes vendors trackers", href: "/dashboard/graph" },
  { id: "page:recommendations", type: "page", title: "Consent recommendations", subtitle: "Configuration gaps", href: "/dashboard/recommendations" },
  { id: "page:data-flow", type: "page", title: "Data flow consent map", subtitle: "Tracker to vendor flows", href: "/dashboard/data-flow" },
  { id: "page:audit", type: "page", title: "Audit logs", subtitle: "Activity history", href: "/dashboard/audit-logs" },
  { id: "page:notifications", type: "page", title: "Notifications", subtitle: "Alerts", href: "/dashboard/notifications" },
  { id: "page:rights", type: "page", title: "Rights requests", subtitle: "DPDP requests", href: "/dashboard/rights-requests" },
  { id: "page:developers", type: "page", title: "API keys", subtitle: "Developers", href: "/dashboard/developers" },
  { id: "page:integrations", type: "page", title: "Integrations", subtitle: "Connected tools", href: "/dashboard/integrations" },
  { id: "page:webhooks", type: "page", title: "Webhooks", subtitle: "Event delivery", href: "/dashboard/developers/webhooks" },
  { id: "page:org", type: "page", title: "Organization settings", subtitle: "Workspace", href: "/dashboard/settings/organization" },
  { id: "page:team", type: "page", title: "Team and roles", subtitle: "Members", href: "/dashboard/settings/team" },
];

export function matchDashboardPages(query: string, limit = 8): DashboardSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return DASHBOARD_PAGES.slice(0, 6);
  return DASHBOARD_PAGES.filter((page) => {
    const haystack = `${page.title} ${page.subtitle} ${page.href}`.toLowerCase();
    return haystack.includes(q);
  }).slice(0, limit);
}
