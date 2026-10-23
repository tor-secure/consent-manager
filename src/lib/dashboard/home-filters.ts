export type DashboardFilters = {
  days: string | null;
  from: string | null;
  to: string | null;
  websiteId: string | null;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseDashboardFilters(input: {
  days?: string;
  from?: string;
  to?: string;
  websiteId?: string;
}): DashboardFilters {
  const from = input.from && DATE_RE.test(input.from) ? input.from : null;
  const to = input.to && DATE_RE.test(input.to) ? input.to : null;
  const websiteId = input.websiteId && UUID_RE.test(input.websiteId) ? input.websiteId : null;
  if (from || to) {
    return { days: null, from, to, websiteId };
  }
  const days = input.days === "7" || input.days === "30" || input.days === "90" || input.days === "all"
    ? input.days
    : "30";
  return { days, from: null, to: null, websiteId };
}
