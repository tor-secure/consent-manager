export const RECORD_PAGE_SIZES = [10, 25, 50, 100] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export type RecordSort = "consented" | "expires";
export type RecordDir = "asc" | "desc";
export type RecordStatusFilter = "" | "accepted" | "partial" | "rejected" | "withdrawn" | "expired";

export type RecordListQuery = {
  q: string;
  status: RecordStatusFilter;
  websiteId: string;
  policyId: string;
  jurisdiction: string;
  from: string;
  to: string;
  sort: RecordSort;
  dir: RecordDir;
  page: number;
  size: (typeof RECORD_PAGE_SIZES)[number];
};

const STATUS_FILTERS = new Set<RecordStatusFilter>(["", "accepted", "partial", "rejected", "withdrawn", "expired"]);

export function parseRecordListQuery(params: {
  q?: string;
  status?: string;
  website?: string;
  policy?: string;
  jurisdiction?: string;
  from?: string;
  to?: string;
  sort?: string;
  dir?: string;
  page?: string;
  size?: string;
}): RecordListQuery {
  const status = STATUS_FILTERS.has(params.status as RecordStatusFilter) ? (params.status as RecordStatusFilter) : "";
  const sizeNumber = Number(params.size);
  const size = RECORD_PAGE_SIZES.find((value) => value === sizeNumber) ?? 50;
  const pageNumber = Number(params.page);
  const page = Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;
  return {
    q: (params.q ?? "").trim().slice(0, 120),
    status,
    websiteId: params.website && UUID_RE.test(params.website) ? params.website : "",
    policyId: params.policy && UUID_RE.test(params.policy) ? params.policy : "",
    jurisdiction: (params.jurisdiction ?? "").trim().slice(0, 100),
    from: params.from && DAY_RE.test(params.from) ? params.from : "",
    to: params.to && DAY_RE.test(params.to) ? params.to : "",
    sort: params.sort === "expires" ? "expires" : "consented",
    dir: params.dir === "asc" ? "asc" : "desc",
    page,
    size,
  };
}

export function recordListHref(query: RecordListQuery, overrides: Partial<RecordListQuery> = {}) {
  const next = { ...query, ...overrides };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.status) params.set("status", next.status);
  if (next.websiteId) params.set("website", next.websiteId);
  if (next.policyId) params.set("policy", next.policyId);
  if (next.jurisdiction) params.set("jurisdiction", next.jurisdiction);
  if (next.from) params.set("from", next.from);
  if (next.to) params.set("to", next.to);
  if (next.sort !== "consented") params.set("sort", next.sort);
  if (next.dir !== "desc") params.set("dir", next.dir);
  if (next.size !== 50) params.set("size", String(next.size));
  if (next.page > 1) params.set("page", String(next.page));
  const search = params.toString();
  return search ? `/dashboard/consent?${search}` : "/dashboard/consent";
}

export function recordExportHref(query: RecordListQuery) {
  const pageHref = recordListHref({ ...query, page: 1, size: 50 });
  const search = pageHref.split("?")[1] ?? "";
  return search ? `/api/consent/records/export?${search}` : "/api/consent/records/export";
}

export function isUnknownJurisdiction(value: string | null | undefined) {
  if (!value) return true;
  const trimmed = value.trim();
  return trimmed.length === 0 || trimmed.toLowerCase() === "unknown";
}

export function displayConsentStatus(
  record: { status: string; withdrawnAt: Date | null; expiresAt: Date | null },
  now = new Date(),
) {
  if (record.withdrawnAt || record.status === "withdrawn") {
    return { key: "withdrawn", label: "Withdrawn" };
  }
  if (record.expiresAt && record.expiresAt.getTime() < now.getTime()) {
    return { key: "expired", label: "Expired" };
  }
  if (record.status === "accepted") return { key: "accepted", label: "Accepted" };
  if (record.status === "partial") return { key: "partial", label: "Partially Accepted" };
  if (record.status === "rejected") return { key: "rejected", label: "Denied" };
  return { key: record.status || "other", label: record.status || "—" };
}

export function csvCell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}
