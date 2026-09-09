import { dashboardNavigation } from "../config/navigation";

export type DashboardSearchHit = {
  id: string;
  type: "page" | "website" | "policy" | "purpose" | "vendor";
  title: string;
  subtitle: string;
  href: string;
};

const secondaryPages: DashboardSearchHit[] = [
  { id: "page:websites-new", type: "page", title: "Add website", subtitle: "Register a site", href: "/dashboard/websites/new" },
  { id: "page:regulations", type: "page", title: "Consent regulations", subtitle: "Jurisdiction and signals", href: "/dashboard/websites" },
  { id: "page:policies-new", type: "page", title: "Create policy", subtitle: "New consent policy", href: "/dashboard/policies/new" },
];

export const DASHBOARD_PAGES: DashboardSearchHit[] = [
  ...dashboardNavigation.map((item) => ({
    id: `page:${item.href.replace(/^\/dashboard\/?/, "").replaceAll("/", ":") || "dashboard"}`,
    type: "page" as const,
    title: item.title,
    subtitle: item.description,
    href: item.href,
  })),
  ...secondaryPages,
];

export function matchDashboardPages(query: string, limit = 8): DashboardSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return DASHBOARD_PAGES.slice(0, 6);
  return DASHBOARD_PAGES.filter((page) => {
    const haystack = `${page.title} ${page.subtitle} ${page.href}`.toLowerCase();
    return haystack.includes(q);
  }).slice(0, limit);
}
